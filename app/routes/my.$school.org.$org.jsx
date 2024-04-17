import db, { schools } from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Link, Form, useActionData } from "@remix-run/react"
import { commitSession, getSession } from "../utils/sessions.js"
import EventCard, { Pill } from "../components/EventCard.jsx"
import Container from "../components/Container.jsx"
import Button from "../components/Button.jsx"

export const meta = () => {
    return [
        { title: "UConnect" },
        {
            name: "description",
            content: "University event planner",
        },
    ]
}

const actions = {
    ORG_JOIN: 1,
    ORG_LEAVE: 2
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
        throw redirect(`/my/${ school.domain }/login`)
    }

    // Get the form data
    const data = new URLSearchParams(await request.text())
    const org = data.get("org")
    const type = data.get("type")

    if (type == actions.ORG_JOIN) {
        // Add the user to the organization as a member
        await (await db()).query(
            `insert into member (student, organization)
                values ($1, $2)`,
            [user.id, org]
        )
        return json({ error: null }, {
            headers: { "Set-Cookie": await commitSession(session) }
        })
    } else if (type == actions.ORG_LEAVE) {
        // Remove the user from the organization as a member
        await (await db()).query(
            `delete from member
                where student = $1 and organization = $2`,
            [user.id, org]
        )
        return json({ error: null }, {
            headers: { "Set-Cookie": await commitSession(session) }
        })
    }

    return json({ error: "Invalid action" })
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

    // Get list of event types
    const eventTypes = await (await db()).query("SELECT * FROM EventTypes")

    // Get organization info
    const org = await (await db()).query(
        `select o.* from organizations o, schools s, registeredat r
            where o.id = r.organization and s.id = r.school and o.id = $1`,
        [params.org]
    )

    if (org.rows.length == 0) {
        throw redirect(`/my/${school.domain}`)
    }

    // Get member list
    const members = await (await db()).query(
        `select * from member m, students s
            where m.organization = $1 and m.student = s.id
            order by s.first_name, s.last_name`,
        [org.rows[0].id]
    )

    // Get admin
    const admin = await (await db()).query(
        `select * from administrates a, students s
            where a.organization = $1 and a.student = s.id`,
        [org.rows[0].id]
    )

    // Get organization events
    const events = await (await db()).query(
        `select e0.*, null as public
            from events e0, organizationevents e2, organizedby r2, organizations o, "member" m,
                registeredat r
            where e0.id = e2.id and e2.id = r2."event" and r2.organization = o.id
                and o.id = m.organization and r.organization = o.id
                and r.school = $1 and m.student = $2 and o.id = $3`,
        [school.id, user.id, org.rows[0].id]
    )

    return json({ error: null, user, school, eventTypes: eventTypes.rows, org: org.rows[0], members: members.rows, admin: admin.rows[0], events: events.rows }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}


export default function School() {
    // Use loader
    const { error, user, school, eventTypes, org, members, admin, events } = useLoaderData() || {}
    const { error: actionError } = useActionData() || {}

    return (
        <div className="w-full min-h-screen h-full flex flex-col bg-gray-200">
            <div className="mx-auto max-w-screen-lg flex flex-col w-full bg-gray-50 mb-10 ring-1 ring-gray-900 ring-opacity-5 shadow-md rounded-b-lg pb-4">
                <div className="h-full w-full relative overflow-hidden">
                    <img src="/images/auth_bg.jpg" alt="background" className="h-4 w-full object-cover" />
                    <div className="absolute top-0 left-0 flex flex-col items-center justify-center h-4 w-full bg-orange-700 bg-opacity-70">
                    </div>
                    <div className="flex px-8 relative flex-col">
                        <Link to="../" className="text-orange-500 mt-4">&#9666;Back</Link><br />
                        {actionError && <div className="w-full my-2 bg-red-500 text-white font-bold py-1 px-3 text-sm rounded-lg">{actionError}</div>}
                        <Container>
                            <div className="flex flex-row justify-between">
                                <h1 className="font-bold text-gray-900 text-4xl">{org.name}</h1>
                                {school.id == user.school.id && admin.id != user.id && <Form method="post">
                                    <input type="hidden" name="org" value={org.id} />
                                    <input type="hidden" name="type" value={members.find(m => m.id == user.id) ? actions.ORG_LEAVE : actions.ORG_JOIN} />
                                    <Button type="submit" className="bg-orange-500 text-white py-2 px-6 rounded-md my-auto ml-auto font-bold text-sm">{members.find(m => m.id == user.id) ? "Leave" : "Join"}</Button>
                                </Form>}
                            </div>
                        </Container>
                        <Container header="About">
                            {org.description ? <p className="text-gray-700">{org.description}</p> : <p className="text-gray-700 italic">No description available</p>}
                        </Container>
                        <Container header="Contact">
                            <div className="flex flex-row space-x-8">
                                <p className="text-gray-700">Phone: {org.phone}</p>
                                <p className="text-gray-700">Email: {org.email}</p>
                            </div>
                        </Container>
                        <Container header="Admin">
                            <div className="mt-2 grid grid-flow-row grid-cols-3 gap-x-4 gap-y-4">
                                <div className="flex flex-row rounded-md border border-gray-300 px-4 py-2">
                                    <img src="/images/default_user.png" className="my-auto w-auto h-8 rounded-full" />
                                    <p className="flex flex-col ml-4 my-auto mr-4 text-gray-700 leading-none">{admin.first_name} {admin.last_name}
                                    </p>
                                    <Pill className="my-auto ml-auto">Admin</Pill>
                                </div>
                            </div>
                        </Container>
                        <Container header="Members">
                            <div className="mt-2 grid grid-flow-row grid-cols-3 gap-x-4 gap-y-4">
                                {members.filter(m => m.id !== admin.id).length == 0 && <p className="text-gray-700 italic">No members</p>}
                                {members.filter(m => m.id !== admin.id).map(m => (
                                    <div key={m.id} className="flex flex-row rounded-md border border-gray-300 px-4 py-2">
                                        <img src="/images/default_user.png" className="my-auto w-auto h-8 rounded-full" />
                                        <p className="flex flex-col ml-4 my-auto mr-4 text-gray-700 leading-none">{m.first_name} {m.last_name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Container>
                        {school.id == user.school.id && <Container header="Upcoming Events">
                            {events.length == 0 && <p className="text-gray-700 italic">No events scheduled</p>}
                            <div className="mt-2 grid grid-flow-row grid-cols-1 gap-x-4 gap-y-4">
                                {events.map(e => (
                                    <EventCard key={e.id}
                                        link={`../event/${ e.id }`}
                                        eventTypes={eventTypes}
                                        eid={e.id}
                                        name={e.name}
                                        date_from={e.date_from}
                                        date_to={e.date_to}
                                        type={e.type}
                                        isPublic={e.public}
                                    />
                                ))}
                            </div>
                        </Container>}
                    </div>
                </div>
            </div>
        </div>
    )
}

