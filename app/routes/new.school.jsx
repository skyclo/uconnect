import db from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData } from "@remix-run/react"
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
    const body = new URLSearchParams(await request.text())
    const sid = body.get("sid") || null
    const name = body.get("name")
    const domain = body.get("domain")
    const address = body.get("address")

    // Get user
    if (!sid) {
        throw redirect("/new")
    }

    // Add school to database
    await (await db()).query(
        `INSERT INTO Schools (name, domain, address)
        VALUES ($1, $2, $3)`,
        [name, domain, address]
    )

    // Add user to school
    const school = await (await db()).query(
        `SELECT * FROM Schools WHERE domain = $1`,
        [domain]
    )

    await (await db()).query(
        `INSERT INTO Attends (student, school)
        VALUES ($1, $2)`,
        [sid, school.rows[0].id]
    )

    await (await db()).query(
        `INSERT INTO SuperAdministrates (student, school)
        VALUES ($1, $2)`,
        [sid, school.rows[0].id]
    )

    throw redirect(`/my/${domain}/login`)
}

export const loader = async ({request}) => {
    const url = new URL(request.url)
    const sid = url.searchParams.get("sid") || null

    if (!sid) {
        throw redirect("/new")
    }

    return json({ sid })
}

export default function Index() {
    const { sid } = useLoaderData()

    return (
        <AuthForm
            header="Add a new university"
            linkText="Now for your school's details"
            inputs={[
                { label: "School Name", type: "text", name: "name", required: true },
                { label: "School Domain (ex. xyz.edu)", type: "text", name: "domain", required: true },
                { label: "School Address", type: "text", name: "address", required: true }
            ]}
            submitText="Create"
        >
                {/* Hidden input containing sid of superadmin */}
            <input type="hidden" name="sid" value={sid} />
        </AuthForm>
    );
}
