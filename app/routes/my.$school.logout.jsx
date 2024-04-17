import { schools } from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { Link, useLoaderData } from "@remix-run/react"
import { getSession, commitSession, destroySession } from "../utils/sessions"
import AuthForm from "../components/AuthForm.jsx"
import Button from "../components/Button.jsx"

export const action = async ({ request }) => {
    const session = await getSession(request.headers.get("Cookie"))
    return redirect("/", {
        headers: { "Set-Cookie": await destroySession(session) }
    })
}

export const loader = async ({ request, params }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))

    // Find out if the domain is already in the database as a school
    const school = await schools.find.byDomain(params.school)

    if (!school) {
       throw redirect("/")
    }

    // If we are not logged in, redirect to the school's login page
    if (!session.has("id")) {
        throw redirect(`/my/${school.domain}/login`)
    }

    return json({ error: null, school }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}


export default function Logout() {
    const { school } = useLoaderData() || {}

    return (
        <AuthForm
            header="Are you sure you want to log out?"
            schoolName={school.name}
            domain={school.domain}
            showDomain={false}
        >
            <div className="flex flex-row mt-4">
                <Link to={`/my/${school.domain}`} className="bg-gray-300 text-gray-900 py-2.5 px-6 rounded-md my-2 mr-auto font-bold text-sm">Cancel</Link>
                <Button type="submit">Log Out</Button>
            </div>
        </AuthForm>
    )
}
