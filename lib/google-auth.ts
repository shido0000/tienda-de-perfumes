import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
};

export function getGoogleClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export async function verifyGoogleIdToken(
  credential: string,
  nonce: string,
): Promise<GoogleIdentity> {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error("Google Client ID no configurado");

  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
    issuer: ["accounts.google.com", "https://accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
  });

  if (
    !payload.sub ||
    typeof payload.email !== "string" ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new Error("El token de Google no tiene una identidad verificada");
  }
  if (!nonce || payload.nonce !== nonce) {
    throw new Error("El token de Google no coincide con la solicitud");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: typeof payload.name === "string" ? payload.name : null,
    emailVerified: true,
  };
}
