/**
 * Copyright (c) AXA Assistance France
 *
 * Licensed under the AXA Assistance France License (the "License"); you
 * may not use this file except in compliance with the License.
 * A copy of the License can be found in the LICENSE.md file distributed
 * together with this file.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * OAuth2 Issuer library
 *
 * @module lib/oauth2-issuer
 */

import { EventEmitter } from 'events';

import { importJWK, SignJWT } from 'jose';

import { JWKStore } from './jwk-store';
import { assertIsString, defaultTokenTtl } from './helpers';
import {
  Header,
  MutableToken,
  OAuthIssuerOptions,
  Payload,
  TokenBuildOptions,
} from './types';
import { InternalEvents } from './types-internals';

/**
 * Represents an OAuth 2 issuer.
 */
export class OAuth2Issuer extends EventEmitter {
  /**
   * Sets or returns the issuer URL.
   *
   * @type {string}
   */
  url: string | undefined;

  private readonly _keys: JWKStore;
  private readonly audience: string[];

  /**
   * Creates a new instance of HttpServer.
   *
   * @param options
   */
  constructor(options: OAuthIssuerOptions) {
    super();
    this.url = undefined;
    this._keys = new JWKStore();
    this.audience = options.audience ? options.audience.split(',') : [];
  }

  /**
   * Returns the key store.
   *
   * @type {JWKStore}
   */
  get keys(): JWKStore {
    return this._keys;
  }

  /**
   * Builds a JWT.
   *
   * @param {TokenBuildOptions} [opts] JWT token building overrides
   * @returns {Promise<string>} The produced JWT.
   * @fires OAuth2Issuer#beforeSigning
   */
  async buildToken(opts?: TokenBuildOptions): Promise<string> {
    const key = this.keys.get(opts?.kid);

    if (key === undefined) {
      throw new Error('Cannot build token: Unknown key.');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const header: Header = {
      kid: key.kid,
    };

    assertIsString(this.url, 'Unknown issuer url');

    const payload: Payload = {
      iss: this.url,
      iat: timestamp,
      exp: timestamp + (opts?.expiresIn ?? defaultTokenTtl),
      nbf: timestamp - 10,
      aud: [this.url, ...this.audience],
    };

    if (opts?.scopesOrTransform !== undefined) {
      const scopesOrTransform = opts.scopesOrTransform;

      if (typeof scopesOrTransform === 'string') {
        payload.scope = scopesOrTransform;
      } else if (Array.isArray(scopesOrTransform)) {
        payload.scope = scopesOrTransform.join(' ');
      } else if (typeof scopesOrTransform === 'function') {
        scopesOrTransform(header, payload);
      }
    }

    const token: MutableToken = {
      header,
      payload,
    };

    /**
     * Before signing event.
     *
     * @event OAuth2Issuer#beforeSigning
     * @param {MutableToken} token The JWT header and payload.
     */
    this.emit(InternalEvents.BeforeSigning, token);

    const privateKey = await importJWK(key);

    const jwt = await new SignJWT(token.payload)
      .setProtectedHeader({ ...token.header, typ: 'JWT', alg: key.alg })
      .sign(privateKey);

    return jwt;
  }
}
