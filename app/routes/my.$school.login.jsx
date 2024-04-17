import db, {schools, students} from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, useActionData } from "@remix-run/react"
import { getSession, commitSession } from "../utils/sessions.js"
import AuthForm from "../components/AuthForm.jsx"



export const meta = () => {
    return [
        { title: "UConnect" },
        {
            name: "description",
            content: "University event planner",
        },
    ];
};



export const action = async ({ request, params }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))
    // If we are logged in, redirect to the school page
    if (session.has("id")) {
        throw redirect(`/my/${ params.school }`)
    }

    // Add user to database
    const body = new URLSearchParams(await request.text())
    const email = body.get("email")
    const password = body.get("password")

    // Check if user exists, if the passwords match, and if they attend the school
    let student = await students.find.byEmail(email)
    if (!student || student.password !== password ) {
        return json({ error: "Invalid credentials" }, {
            headers: { "Set-Cookie": await commitSession(session) },
            status: 400
        })
    }
    let school = await (await db()).query(
        `SELECT * FROM Schools WHERE domain = $1`,
        [params.school]
    )
    if (school.rows.length === 0) {
        return json({ error: "School not found" }, {
            headers: { "Set-Cookie": await commitSession(session) },
            status: 400
        })
    }
    let attends = await (await db()).query(
        `SELECT * FROM Attends WHERE student = $1 AND school = $2`,
        [student.id, school.rows[0].id]
    )
    if (attends.rows.length === 0) {
        return json({ error: "Invalid credentials" }, {
            headers: { "Set-Cookie": await commitSession(session) },
            status: 400
        })
    }

    session.set("id", student.id)
    session.set("email", student.email)
    session.set("first_name", student.first_name || null)
    session.set("last_name", student.last_name || null)
    session.set("school", school.rows[0])

    // Redirect to the school page
    throw redirect(`/my/${ params.school }`, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}



export const loader = async ({ request, params }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))

    // If we are logged in, redirect to the school page
    if (session.has("id")) {
        throw redirect(`/my/${params.school}`)
    }

    // Find out if the domain is already in the database as a school
    const school = await schools.find.byDomain(params.school)

    if (!school) {
        throw redirect("/")
    }

    return json({ error: null, school }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}



export default function Index() {
    // Use loader
    const { school, error: loaderError } = useLoaderData() || {};
    const { error: actionError } = useActionData() || {}

    return (
        <AuthForm
            header="Log into an existing account"
            linkText="Or register for a new account"
            linkHref={`/my/${ school.domain }/signup`}
            schoolName={school.name}
            domain={school.domain}
            inputs={[
                { label: "Email", type: "email", name: "email", required: true },
                { label: "Password", type: "password", name: "password", required: true }
            ]}
            error={actionError || loaderError}
            submitText="Log In"
        />
    );
}
