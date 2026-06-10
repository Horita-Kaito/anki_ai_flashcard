<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Passport\ClientRepository;
use Tests\TestCase;

/**
 * PKCE 付き Authorization Code フローを実機相当で一巡させる。
 * claude.ai 等のコネクタが行うのと同じ手順:
 * authorize -> 承認 -> code -> token 交換 -> /mcp 呼び出し。
 */
final class OAuthAuthorizeFlowTest extends TestCase
{
    use RefreshDatabase;

    private const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';

    public function test_pkc_e認可コードフローで_mc_pにアクセスできる(): void
    {
        $user = User::factory()->create();

        $client = app(ClientRepository::class)->createAuthorizationCodeGrantClient(
            name: 'Claude',
            redirectUris: [self::REDIRECT_URI],
            confidential: false,
        );

        $codeVerifier = Str::random(64);
        $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

        // 1. 認可リクエスト (ログイン済みユーザー) -> 承認画面
        $authorizeResponse = $this->actingAs($user, 'web')->get('/oauth/authorize?'.http_build_query([
            'client_id' => $client->getKey(),
            'redirect_uri' => self::REDIRECT_URI,
            'response_type' => 'code',
            'scope' => 'mcp:use',
            'state' => 'test-state',
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]));

        $authorizeResponse->assertOk()->assertViewIs('oauth.authorize');
        $authToken = session('authToken');
        $authRequest = session('authRequest');
        $this->assertNotNull($authToken);

        // 2. 承認 -> リダイレクトに code が付く
        // (テストのリクエスト間でセッションは引き継がれないため明示的に注入する)
        $approveResponse = $this->actingAs($user, 'web')
            ->withSession([
                'authToken' => $authToken,
                'authRequest' => $authRequest,
                '_token' => 'test-csrf',
            ])
            ->post('/oauth/authorize', [
                '_token' => 'test-csrf',
                'state' => 'test-state',
                'client_id' => $client->getKey(),
                'auth_token' => $authToken,
            ]);

        $approveResponse->assertRedirect();
        $location = $approveResponse->headers->get('Location');
        $this->assertStringStartsWith(self::REDIRECT_URI, (string) $location);
        parse_str((string) parse_url((string) $location, PHP_URL_QUERY), $query);
        $this->assertSame('test-state', $query['state']);
        $this->assertArrayHasKey('code', $query);

        // 3. code -> token 交換 (PKCE verifier)
        $tokenResponse = $this->postJson('/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => $client->getKey(),
            'redirect_uri' => self::REDIRECT_URI,
            'code' => $query['code'],
            'code_verifier' => $codeVerifier,
        ]);

        $tokenResponse->assertOk()->assertJsonStructure(['access_token', 'token_type']);
        $accessToken = $tokenResponse->json('access_token');

        // 4. OAuth トークンで /mcp を呼べる
        $this->flushSession();

        $this->withHeader('Authorization', "Bearer {$accessToken}")
            ->postJson('/mcp', [
                'jsonrpc' => '2.0',
                'id' => 1,
                'method' => 'tools/list',
            ], ['Accept' => 'application/json, text/event-stream'])
            ->assertOk();
    }

    public function test_拒否するとerrorパラメータ付きでリダイレクトされる(): void
    {
        $user = User::factory()->create();

        $client = app(ClientRepository::class)->createAuthorizationCodeGrantClient(
            name: 'Claude',
            redirectUris: [self::REDIRECT_URI],
            confidential: false,
        );

        $codeVerifier = Str::random(64);
        $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

        $this->actingAs($user, 'web')->get('/oauth/authorize?'.http_build_query([
            'client_id' => $client->getKey(),
            'redirect_uri' => self::REDIRECT_URI,
            'response_type' => 'code',
            'scope' => 'mcp:use',
            'state' => 'test-state',
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]))->assertOk();

        $authToken = session('authToken');
        $authRequest = session('authRequest');

        $denyResponse = $this->actingAs($user, 'web')
            ->withSession([
                'authToken' => $authToken,
                'authRequest' => $authRequest,
                '_token' => 'test-csrf',
            ])
            ->delete('/oauth/authorize', [
                '_token' => 'test-csrf',
                'state' => 'test-state',
                'client_id' => $client->getKey(),
                'auth_token' => $authToken,
            ]);

        $denyResponse->assertRedirect();
        $this->assertStringContainsString('error=access_denied', (string) $denyResponse->headers->get('Location'));
    }

    public function test_未ログインで認可エンドポイントに来るとログイン画面へ誘導される(): void
    {
        $client = app(ClientRepository::class)->createAuthorizationCodeGrantClient(
            name: 'Claude',
            redirectUris: [self::REDIRECT_URI],
            confidential: false,
        );

        $codeVerifier = Str::random(64);
        $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

        $this->get('/oauth/authorize?'.http_build_query([
            'client_id' => $client->getKey(),
            'redirect_uri' => self::REDIRECT_URI,
            'response_type' => 'code',
            'scope' => 'mcp:use',
            'state' => 'test-state',
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]))->assertRedirect('/login');
    }
}
