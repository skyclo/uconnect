import db, {schools} from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Link, Form, useActionData } from "@remix-run/react"
import { commitSession, getSession } from "../utils/sessions.js"
import TextAreaInput from "../components/TextAreaInput.jsx"
import TextInput from "../components/TextInput.jsx"
import Button from "../components/Button.jsx"
import Container from "../components/Container.jsx"
import { useState } from "react"
import CheckboxInput from "../components/CheckboxInput.jsx"

export const meta = () => {
    return [
        { title: "UConnect" },
        {
            name: "description",
            content: "University event planner",
        },
    ]
}

export const action = async ({ request, params }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))
    const user = session.data

    // Find out if the domain is already in the database as a school
    const school = await schools.find.byDomain(params.school)

    if (!school) {
       throw redirect("/")
    }

    // If we are not logged in, redirect to the school's login page
    if (!session.has("id")) {
        throw redirect(`/my/${school.domain}/login`)
    }

    // Get the form data
    const data = new URLSearchParams(await request.text())
    const name = data.get("name")
    const description = data.get("description")
    const members = JSON.parse(data.getAll("members")) || []
    const phone = data.get("phone")
    const email = data.get("email")

    console.log(members)

    // Check if members >= 4
    if (members.length < 4) {
        return json({ error: "Organization must have at least 4 members (including yourself)" })
    }

    // Create the school organization
    const org = (await (await db()).query(
        `insert into organizations (name, description, phone, email)
            values ($1, $2, $3, $4)
            returning id`,
        [name, description, phone, email]
    ))?.rows?.[0]?.id

    // Add the admin to the organization as an admin
    await (await db()).query(
        `insert into administrates (student, organization)
            values ($1, $2)`,
        [user.id, org]
    )

    // Add the members to the organization
    for (let member of members) {
        await (await db()).query(
            `insert into member (student, organization)
                values ($1, $2)`,
            [member, org]
        )
    }

    // Add relationship between school and organization
    await (await db()).query(
        `insert into registeredat (school, organization)
            values ($1, $2)`,
        [school.id, org]
    )

    return redirect(`/my/${params.school}`)
}

export const loader = async ({ request, params }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))
    const user = session.data

    // Find out if the domain is already in the database as a school
    const school = await schools.find.byDomain(params.school)

    if (!school) {
       throw redirect("/")
    }

    // If we are not logged in, redirect to the school's login page
    if (!session.has("id")) {
        throw redirect(`/my/${school.domain}/login`)
    }

    const attendees = await (await db()).query(
        `SELECT * FROM Students s, Attends a
            WHERE a.school = $1 AND a.student = s.id AND s.id != $2
            ORDER BY s.first_name, s.last_name`,
        [school.id, user.id]
    )

    return json({ error: null, school, user, attendees: attendees.rows }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}


export default function School() {
    // Use loader
    const { user, attendees } = useLoaderData() || {}
    const { error: actionError } = useActionData() || {}

    const [members, setMembers] = useState([user.id])

    return (
        <div className="w-full min-h-screen h-full flex flex-col bg-gray-200">
            <div className="mx-auto max-w-screen-lg flex flex-col w-full bg-gray-50 mb-10 ring-1 ring-gray-900 ring-opacity-5 shadow-md rounded-b-lg pb-4">
                <div className="h-full w-full relative overflow-hidden">
                    <img src="/images/auth_bg.jpg" alt="background" className="h-4 w-full object-cover" />
                    <div className="absolute top-0 left-0 flex flex-col items-center justify-center h-4 w-full bg-orange-700 bg-opacity-70">
                    </div>
                    <Form className="flex px-8 relative flex-col" method="post">
                        <Link to="../" className="text-orange-500 mt-4">&#9666;Back</Link><br />
                        {actionError && <div className="w-full my-2 bg-red-500 text-white font-bold py-1 px-3 text-sm rounded-lg">{actionError}</div>}
                        <Container>
                            <div className="flex flex-row justify-between">
                                <TextInput type="text" name="name" className="text-2xl mt-0" required placeholder="New Organization..." />
                            </div>
                        </Container>
                        <Container header="Organization Details">
                            <TextAreaInput name="description" placeholder="Add description..." className="mt-4"/>
                            <TextInput type="tel" name="phone" placeholder="Add phone..." className="mt-4" required/>
                            <TextInput type="email" name="email" placeholder="Add email..." className="mt-4" required />
                        </Container>
                        <Container header="Members">
                            <div className="flex flex-col w-full border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-offset-0 focus:ring-orange-500 focus:border-orange-500 h-48 overflow-y-scroll">
                                {attendees.map(a => (
                                    <div
                                        key={a.id}
                                        className="flex flex-row w-full has-[:checked]:font-bold px-4 py-3 cursor-pointer select-none hover:bg-orange-100 transition-colors duration-200 ease-in-out text-gray-900 text-sm"
                                        onClick={() => members.includes(a.id) ? setMembers(members.filter(m => m != a.id)) : setMembers([...members, a.id])}
                                    >
                                        {/* <img src="/images/default_user.png" className="w-auto h-5 rounded-full" /> */}
                                        <p className="mb-px leading-none">
                                            {a.first_name} {a.last_name} &lt;{a.email}&gt; (UID:{a.id})
                                        </p>
                                        <CheckboxInput type="checkbox" name={"member-user-" + a.id} checked={members.includes(a.id)} readOnly className="hidden peer" />
                                        <svg className="peer-checked:visible invisible w-4 h-4 my-auto ml-auto text-orange-500" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" fill="currentColor"  strokeLinejoin="round" viewBox="0 0 24 24" strokeMiterlimit="2"><path d="M21 6.285l-11.16 12.733-6.84-6.018 1.319-1.49 5.341 4.686 9.865-11.196 1.475 1.285z"/></svg>
                                    </div>
                                ))}
                                <input type="hidden" name="members" value={JSON.stringify(members)} />
                            </div>
                        </Container>
                        <Container>
                            <Button type="submit">Save</Button>
                        </Container>
                    </Form>
                </div>
            </div>
        </div>
    )
}

