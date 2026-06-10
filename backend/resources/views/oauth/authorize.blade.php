<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>アクセス許可 | Tessera</title>
    <style>
        :root { color-scheme: light dark; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f7f7f8; }
        .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 2rem; width: min(420px, 90vw); box-shadow: 0 1px 3px rgb(0 0 0 / .06); }
        h1 { font-size: 1.1rem; margin: 0 0 .5rem; }
        p { color: #52525b; font-size: .9rem; }
        ul { padding-left: 1.2rem; font-size: .9rem; color: #3f3f46; }
        .actions { display: flex; gap: .75rem; margin-top: 1.5rem; }
        button { flex: 1; padding: .6rem; border-radius: 8px; font-size: .95rem; cursor: pointer; }
        .approve { border: 0; background: #18181b; color: #fff; }
        .deny { border: 1px solid #d4d4d8; background: transparent; color: #3f3f46; }
        .user { font-size: .8rem; color: #71717a; margin-top: 1.25rem; }
        @media (prefers-color-scheme: dark) {
            body { background: #18181b; }
            .card { background: #27272a; border-color: #3f3f46; }
            p, ul { color: #d4d4d8; }
            .approve { background: #fafafa; color: #18181b; }
            .deny { border-color: #52525b; color: #d4d4d8; }
        }
    </style>
</head>
<body>
    <main class="card">
        <h1>{{ $client->name }} がアクセスを求めています</h1>
        <p>許可すると、このアプリケーションはあなたの Tessera アカウントで次の操作ができるようになります:</p>

        <ul>
            @forelse ($scopes as $scope)
                <li>{{ $scope->description }}</li>
            @empty
                <li>基本的なアカウントアクセス</li>
            @endforelse
        </ul>

        <div class="actions">
            <form method="POST" action="{{ route('passport.authorizations.approve') }}" style="flex:1; display:flex;">
                @csrf
                <input type="hidden" name="state" value="{{ $request->state }}">
                <input type="hidden" name="client_id" value="{{ $client->getKey() }}">
                <input type="hidden" name="auth_token" value="{{ $authToken }}">
                <button type="submit" class="approve">許可する</button>
            </form>

            <form method="POST" action="{{ route('passport.authorizations.deny') }}" style="flex:1; display:flex;">
                @csrf
                @method('DELETE')
                <input type="hidden" name="state" value="{{ $request->state }}">
                <input type="hidden" name="client_id" value="{{ $client->getKey() }}">
                <input type="hidden" name="auth_token" value="{{ $authToken }}">
                <button type="submit" class="deny">拒否する</button>
            </form>
        </div>

        <p class="user">{{ $user->email }} としてログイン中</p>
    </main>
</body>
</html>
