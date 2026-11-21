import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

let keys: ReturnType<typeof createRemoteJWKSet> | undefined;

// Cloudflare Access sits in front; this rejects anything that bypassed it.
export const requireAccess: MiddlewareHandler<{ Bindings: Env }> = async (
	c,
	next,
) => {
	if (c.env.ACCESS_DISABLED === "true") return next();
	const { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: audience } = c.env;
	const token = c.req.header("cf-access-jwt-assertion");
	if (!team || !audience || !token) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	keys ??= createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
	try {
		await jwtVerify(token, keys, { issuer: team, audience });
	} catch {
		return c.json({ error: "Unauthorized" }, 401);
	}
	return next();
};
