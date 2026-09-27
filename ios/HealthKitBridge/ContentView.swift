import SwiftUI

struct ContentView: View {
    @StateObject private var syncManager = HealthKitSyncManager()
    @State private var apiBaseURL = "http://192.168.1.25:3000/api"
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Connexion SuiviPatient") {
                    TextField("URL API", text: $apiBaseURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    TextField("E-mail patient", text: $email)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.emailAddress)
                    SecureField("Mot de passe", text: $password)
                }

                Section("Apple Watch") {
                    Text("L'application lit les données autorisées dans Apple Health sur l'iPhone, puis les transmet à SuiviPatient.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    Button {
                        Task {
                            await syncManager.sync(email: email, password: password, apiBaseURL: apiBaseURL)
                        }
                    } label: {
                        HStack {
                            if syncManager.isBusy { ProgressView().tint(.white) }
                            Text(syncManager.isBusy ? "Synchronisation..." : "Synchroniser mes données")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(syncManager.isBusy || email.isEmpty || password.isEmpty)

                    Text(syncManager.status)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("SuiviPatient")
        }
    }
}

#Preview {
    ContentView()
}
