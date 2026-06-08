import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("メールアドレス", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()

                    SecureField("パスワード", text: $password)
                }

                if let errorMessage = session.errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button {
                        Task {
                            isSubmitting = true
                            await session.login(email: email, password: password)
                            isSubmitting = false
                        }
                    } label: {
                        if isSubmitting {
                            ProgressView()
                        } else {
                            Text("ログイン")
                        }
                    }
                    .disabled(isSubmitting || email.isEmpty || password.isEmpty)
                }
            }
            .navigationTitle("まなメモAI")
        }
    }
}
