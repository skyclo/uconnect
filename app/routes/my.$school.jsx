import {schools} from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Outlet } from "@remix-run/react"
import { commitSession, getSession } from "../utils/sessions.js"

export const meta = () => {
    return [
        { title: "UConnect" },
        {
            name: "description",
            content: "University event planner",
        },
    ]
}

export const loader = async ({ request, params }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))

    // Find out if the domain is already in the database as a school
    const school = await schools.find.byDomain(params.school)

    if (!school) {
       throw redirect("/")
    }

    return json({ error: null, school }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}

export default function School() {
    // Use loader
    const { error, school } = useLoaderData() || {}

    return (
        <div>
            {/* <h1>{school.name}</h1>
            <p>{school.address}</p>
            {error && <p>{error}</p>} */}
            <Outlet/>
        </div>
    )
}

