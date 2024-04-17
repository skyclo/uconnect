import { createCookieSessionStorage } from "@remix-run/cloudflare"

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
    cookie: {
        name: "__uconnect_session",
        httpOnly: global.env?.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        secure: global.env?.NODE_ENV === "production",
        secrets: ["SECRET_TOKEN"],
    }
})

export { getSession, commitSession, destroySession }
