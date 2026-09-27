import Foundation
import HealthKit

struct LoginResponse: Decodable {
    let token: String
}

struct HealthMeasurementPayload: Encodable {
    let externalId: String
    let type: String
    let value: Double
    let unit: String
    let measuredAt: String
    let source: String
    let metadata: [String: String]
}

struct SyncResponse: Decodable {
    let message: String
    let received: Int
    let created: Int
    let updated: Int
    let invalidCount: Int
    let alertCreated: Bool
}

@MainActor
final class HealthKitSyncManager: ObservableObject {
    @Published private(set) var isBusy = false
    @Published private(set) var status = "Prêt à synchroniser"

    private let healthStore = HKHealthStore()
    private var token: String?

    private let readableIdentifiers: [HKQuantityTypeIdentifier] = [
        .heartRate,
        .restingHeartRate,
        .oxygenSaturation,
        .stepCount,
        .activeEnergyBurned,
        .bodyMass,
        .bodyTemperature,
        .respiratoryRate
    ]

    func sync(email: String, password: String, apiBaseURL: String) async {
        guard HKHealthStore.isHealthDataAvailable() else {
            status = "HealthKit n'est pas disponible sur cet appareil"
            return
        }

        guard let baseURL = normalizedBaseURL(apiBaseURL) else {
            status = "URL API invalide"
            return
        }

        isBusy = true
        defer { isBusy = false }

        do {
            status = "Connexion à SuiviPatient..."
            token = try await login(email: email, password: password, baseURL: baseURL)
            status = "Demande d'accès à Apple Health..."
            try await requestHealthAuthorization()
            status = "Lecture des données Apple Watch..."
            let measurements = try await readRecentMeasurements()
            guard !measurements.isEmpty else {
                status = "Aucune donnée HealthKit disponible"
                return
            }
            status = "Envoi de \(measurements.count) mesures..."
            let result = try await send(measurements: measurements, baseURL: baseURL)
            status = "Synchronisation terminée : \(result.created) nouvelles mesure(s), \(result.updated) mise(s) à jour"
        } catch {
            status = "Erreur : \(error.localizedDescription)"
        }
    }

    private func normalizedBaseURL(_ rawValue: String) -> URL? {
        var value = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.hasSuffix("/") { value.removeLast() }
        guard let url = URL(string: value), url.scheme == "http" || url.scheme == "https" else { return nil }
        return url
    }

    private func login(email: String, password: String, baseURL: URL) async throws -> String {
        var request = URLRequest(url: baseURL.appendingPathComponent("auth/login"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(LoginResponse.self, from: data).token
    }

    private func requestHealthAuthorization() async throws {
        let readTypes = Set(readableIdentifiers.compactMap { HKObjectType.quantityType(forIdentifier: $0) })
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
                if let error { continuation.resume(throwing: error); return }
                if !success {
                    continuation.resume(throwing: SyncError.authorizationDenied)
                    return
                }
                continuation.resume()
            }
        }
    }

    private func readRecentMeasurements() async throws -> [HealthMeasurementPayload] {
        let startDate = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date(timeIntervalSince1970: 0)
        var allMeasurements: [HealthMeasurementPayload] = []
        for identifier in readableIdentifiers {
            if let type = HKObjectType.quantityType(forIdentifier: identifier) {
                allMeasurements.append(contentsOf: try await readSamples(type: type, startDate: startDate))
            }
        }
        return allMeasurements
    }

    private func readSamples(type: HKQuantityType, startDate: Date) async throws -> [HealthMeasurementPayload] {
        try await withCheckedThrowingContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: startDate, end: Date(), options: .strictStartDate)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 100, sortDescriptors: [sort]) { _, samples, error in
                if let error { continuation.resume(throwing: error); return }
                let measurements = (samples as? [HKQuantitySample] ?? []).compactMap { Self.mapSample($0, type: type) }
                continuation.resume(returning: measurements)
            }
            healthStore.execute(query)
        }
    }

    private nonisolated static func mapSample(_ sample: HKQuantitySample, type: HKQuantityType) -> HealthMeasurementPayload? {
        let identifier = HKQuantityTypeIdentifier(rawValue: type.identifier)
        let mapping: (String, HKUnit)
        switch identifier {
        case .heartRate: mapping = ("heart_rate", HKUnit.count().unitDivided(by: .minute()))
        case .restingHeartRate: mapping = ("resting_heart_rate", HKUnit.count().unitDivided(by: .minute()))
        case .oxygenSaturation: mapping = ("oxygen_saturation", .percent())
        case .stepCount: mapping = ("steps", .count())
        case .activeEnergyBurned: mapping = ("active_energy", .kilocalorie())
        case .bodyMass: mapping = ("body_mass", .gramUnit(with: .kilo))
        case .bodyTemperature: mapping = ("body_temperature", .degreeCelsius())
        case .respiratoryRate: mapping = ("respiratory_rate", HKUnit.count().unitDivided(by: .minute()))
        default: return nil
        }

        var value = sample.quantity.doubleValue(for: mapping.1)
        if identifier == .oxygenSaturation { value *= 100 }
        return HealthMeasurementPayload(
            externalId: sample.uuid.uuidString,
            type: mapping.0,
            value: value,
            unit: unitName(for: identifier),
            measuredAt: ISO8601DateFormatter().string(from: sample.startDate),
            source: sample.sourceRevision.source.name,
            metadata: ["device": sample.device?.name ?? "Apple Health"]
        )
    }

    private nonisolated static func unitName(for identifier: HKQuantityTypeIdentifier) -> String {
        switch identifier {
        case .oxygenSaturation: return "%"
        case .stepCount: return "count"
        case .activeEnergyBurned: return "kcal"
        case .bodyMass: return "kg"
        case .bodyTemperature: return "°C"
        case .respiratoryRate: return "count/min"
        default: return "bpm"
        }
    }

    private func send(measurements: [HealthMeasurementPayload], baseURL: URL) async throws -> SyncResponse {
        guard let token else { throw SyncError.missingToken }
        var request = URLRequest(url: baseURL.appendingPathComponent("apple-health/sync"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(["measurements": measurements])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(SyncResponse.self, from: data)
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse, (200..<300).contains(httpResponse.statusCode) else {
            if let serverError = try? JSONDecoder().decode([String: String].self, from: data), let message = serverError["error"] {
                throw SyncError.server(message)
            }
            throw SyncError.server("Réponse serveur invalide")
        }
    }
}

enum SyncError: LocalizedError {
    case authorizationDenied
    case missingToken
    case server(String)

    var errorDescription: String? {
        switch self {
        case .authorizationDenied: return "L'accès aux données Apple Health a été refusé"
        case .missingToken: return "Token patient manquant"
        case .server(let message): return message
        }
    }
}
