import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: AuthSessionStore
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false
    @State private var isPasswordVisible = false

    private var canSubmit: Bool {
        !isSubmitting && !email.isEmpty && !password.isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("メールアドレス", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .textContentType(.username)
                        .autocorrectionDisabled()

                    HStack {
                        Group {
                            if isPasswordVisible {
                                TextField("パスワード", text: $password)
                            } else {
                                SecureField("パスワード", text: $password)
                            }
                        }
                        .textContentType(.password)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                        Button {
                            isPasswordVisible.toggle()
                        } label: {
                            Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                                .foregroundStyle(AppColor.secondaryText)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(isPasswordVisible ? Text("パスワードを隠す") : Text("パスワードを表示"))
                    }
                }

                if let errorMessage = session.errorMessage {
                    Section {
                        InlineStatusView(.error, verbatim: errorMessage)
                    }
                }

                Section {
                    Button(action: submit) {
                        if isSubmitting {
                            LabeledProgressView("ログイン中…")
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("ログイン")
                        }
                    }
                    .buttonStyle(.primaryAction)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    .disabled(!canSubmit)
                }
            }
            .navigationTitle("まなメモAI")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
            }
            .onChange(of: session.isAuthenticated) { _, authenticated in
                if authenticated {
                    Haptics.success()
                    dismiss()
                }
            }
        }
    }

    private func submit() {
        Task {
            isSubmitting = true
            await session.login(email: email, password: password)
            isSubmitting = false
            if !session.isAuthenticated {
                Haptics.error()
            }
        }
    }
}
