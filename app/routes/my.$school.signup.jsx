import db, {schools, students} from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, useActionData } from "@remix-run/react"
import AuthForm from "../components/AuthForm.jsx"
import { getSession } from "../utils/sessions.js"



export const meta = () => {
    return [
        { title: "UConnect" },
        {
            name: "description",
            content: "University event planner",
        },
    ];
}



export const action = async ({ request, params }) => {
    // Add user to database
    const body = new URLSearchParams(await request.text())
    const email = body.get("email")
    const password = body.get("password")
    const firstName = body.get("firstName")
    const lastName = body.get("lastName")

    // Check if user exists
    let student = await students.find.byEmail(email)

    if (student) {
        return json({ error: "Email already in use" }, 400)
    }

    // Get school ID
    const school = await (await db()).query(
        `SELECT * FROM Schools WHERE domain = $1`,
        [params.school]
    )

    // Check if the school exists
    if (school.rows.length === 0) {
        return json({ error: "School not found" }, 400)
    }

    // Check if the email and school domain match
    if (!email.endsWith(`@${school.rows[0].domain}`)) {
        return json({ error: "Email domain does not match school domain" }, 400)
    }

    // Add student to database
    student = await students.insert({ email, password, firstName, lastName })

    // Add user to school
    await (await db()).query(
        `INSERT INTO Attends (student, school) VALUES ($1, $2)`,
        [student.id, school.rows[0].id]
    )

    throw redirect(`/my/${params.school}/login`)
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

    return json({ error: null, school })
}



export default function Index() {
    // Use loader
    const { school, error: loaderError } = useLoaderData() || {};
    const { error: actionError } = useActionData() || {}

    return (
        <AuthForm
            header="Regester for a new account"
            linkText="Or log into an existing account"
            linkHref={`/my/${ school.domain }/login`}
            schoolName={school.name}
            domain={school.domain}
            inputs={[
                { label: "Email", type: "email", name: "email", required: true },
                { label: "Password", type: "password", name: "password", required: true },
                { label: "First Name", type: "firstName", name: "firstName", required: true },
                { label: "Last Name", type: "lastName", name: "lastName", required: true }
            ]}
            error={actionError || loaderError}
            submitText="Sign Up"
        />
    );
}
