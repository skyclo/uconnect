import {students} from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useActionData } from "@remix-run/react"
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

export const action = async ({ request }) => {
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

    student = await students.insert({ email, password, firstName, lastName })

    throw redirect(`/new/school?sid=${student.id}`)
}

export default function Index() {
    const { error } = useActionData() || {}

    return (
        <AuthForm
            header="Add a new university"
            linkText="First we need for you to create a super admin account."
            inputs={[
                { label: "Email", type: "email", name: "email", required: true },
                { label: "Password", type: "password", name: "password", required: true },
                { label: "First Name", type: "firstName", name: "firstName", required: true },
                { label: "Last Name", type: "lastName", name: "lastName", required: true }
            ]}
            error={error}
            submitText="Next"
        />
    );
}
