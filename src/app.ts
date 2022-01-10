import * as uuid from 'uuid';
import { OAuth2Server, MutableToken } from './index';
import { Request } from 'express';

const port = parseInt(process.env.APP_PORT || '8080', 10);
const host = process.env.APP_HOST || '0.0.0.0';

void (async () => {
  const server = new OAuth2Server(undefined, undefined, {
    audience: process.env.TOKEN_AUDIENCE,
    endpoints: {
      token: process.env.TOKEN_ENDPOINT_URL || '/oauth/token',
      jwks: process.env.JWKS_ENDPOINT_URL || '/.well-known/jwks.json',
    },
  });
  // Generate a new RSA key and add it to the keystore
  await server.issuer.keys.generate(process.env.ALGORITHM || 'RS256');
  server.issuer.url = process.env.ISSUER_URL || server.issuer.url;
  //
  server.service.on(
    'beforeTokenSigning',
    (token: MutableToken, req: Request) => {
      Object.assign(token.payload, {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        [process.env.CLAIMS_NAMESPACE ||
        server.issuer.url ||
        'http://localhost']: {
          environment: process.env.ENV_NAME || 'development',
          sscRole: process.env.DEFAULT_ROLE || 'MEMBER',
          userId: process.env.DEFAULT_USER_ID || uuid.v4(),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ...req.body.payload,
        },
      });
    }
  );

  // Start the server
  await server.start(port, host);
  console.log('Issuer URL:', server.issuer.url);
})();
