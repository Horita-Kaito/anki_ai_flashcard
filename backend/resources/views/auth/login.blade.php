<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ログイン | Tessera</title>
    <style>
        :root { color-scheme: light dark; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f7f7f8; }
        .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 2rem; width: min(360px, 90vw); box-shadow: 0 1px 3px rgb(0 0 0 / .06); }
        h1 { font-size: 1.1rem; margin: 0 0 1.25rem; }
        label { display: block; font-size: .85rem; margin-bottom: .25rem; color: #3f3f46; }
        input { width: 100%; box-sizing: border-box; padding: .55rem .7rem; margin-bottom: 1rem; border: 1px solid #d4d4d8; border-radius: 8px; font-size: 1rem; }
        button { width: 100%; padding: .6rem; border: 0; border-radius: 8px; background: #18181b; color: #fff; font-size: 1rem; cursor: pointer; }
        .error { color: #dc2626; font-size: .85rem; margin-bottom: 1rem; }
        @media (prefers-color-scheme: dark) {
            body { background: #18181b; }
            .card { background: #27272a; border-color: #3f3f46; }
            label { color: #d4d4d8; }
            input { background: #18181b; border-color: #52525b; color: #fafafa; }
            button { background: #fafafa; color: #18181b; }
        }
    </style>
</head>
<body>
    <main class="card">
        <h1>Tessera にログイン</h1>

        @if ($errors->any())
            <p class="error">{{ $errors->first() }}</p>
        @endif

        <form method="POST" action="{{ route('login.store') }}">
            @csrf
            <label for="email">メールアドレス</label>
            <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="email">

            <label for="password">パスワード</label>
            <input id="password" type="password" name="password" required autocomplete="current-password">

            <button type="submit">ログイン</button>
        </form>
    </main>
</body>
</html>
