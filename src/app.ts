import { OAuth2Server, MutableToken } from './index';
import { Request } from 'express';

const port = parseInt(process.env.APP_PORT || '8080', 10);
const host = process.env.APP_HOST || '0.0.0.0';

void (async () => {
  const server = new OAuth2Server(undefined, undefined, {
    endpoints: {
      token: '/oauth/token',
      wellKnownDocument: '/.well-known/jwks.json',
    },
  });
  // Generate a new RSA key and add it to the keystore
  await server.issuer.keys.generate(process.env.ALGORITHM || 'RS256');
  //
  server.service.once(
    'beforeTokenSigning',
    (token: MutableToken, req: Request) => {
      Object.assign(token.payload, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        [process.env.CLAIMS_NAMESPACE ||
        server.issuer.url ||
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'http://localhost']: req.body.payload || {},
      });
    }
  );

  // Start the server
  await server.start(port, host);
  console.log('Issuer URL:', server.issuer.url);
})();
