import db, { schools } from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Link } from "@remix-run/react"
import { commitSession, getSession } from "../utils/sessions.js"
import Container from "../components/Container.jsx"
import EventCard, { Pill } from "../components/EventCard.jsx"

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

    // Only get public events if the user is not part of the school
    // Otherwise, get all public and private events and organization
    // events that the user is a part of
    const events = await (await db()).query(
        `select * from (
            select e0.*, e1.public from events e0, schoolevents e1, heldat r1, schools s, attends a
                where e0.id = e1.id and e1.id = r1."event" and r1.school = s.id and a.school = s.id and s.id = $1 and (a.student = $2 or e1.public = true)
            union
            select e0.*, null as public from events e0, organizationevents e2, organizedby r2, organizations o, "member" m, registeredat r
                where e0.id = e2.id and e2.id = r2."event" and r2.organization = o.id and o.id = m.organization and r.organization = o.id and r.school = $1 and m.student = $2
        ) as e order by e.date_from asc`,
        [school.id, user.id]
    )

    // Get the user's organizations
    const memberOrgs = await (await db()).query(
        `select * from organizations o, member m
            where o.id = m.organization and m.student = $1`,
        [user.id]
    )

    // Get the user's organizations where they are an admin
    const adminOrgs = await (await db()).query(
        `select * from organizations o, administrates a
            where o.id = a.organization and a.student = $1`,
        [user.id]
    )

    // Get all organizations
    const orgs = await (await db()).query(
        `select * from organizations o, registeredat r
            where o.id = r.organization and r.school = $1
            order by o.name asc`,
        [school.id]
    )

    // Get list of event types
    const eventTypes = await (await db()).query("SELECT * FROM EventTypes")

    return json({ error: null, school, user, events: events.rows, orgs: orgs.rows, memberOrgs: memberOrgs.rows, eventTypes: eventTypes.rows, adminOrgs: adminOrgs.rows }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}


export default function School() {
    // Use loader
    const { error, school, user, events, orgs, memberOrgs, eventTypes, adminOrgs } = useLoaderData() || {}

    const studentRange = (n) => isNaN((n = parseInt(n)))? "Unknown" : (Math.floor(n / Math.pow(10, n.toString().length - 2)) * Math.pow(10, n.toString().length - 2)).toLocaleString() + "+"

    return (
        <div className="w-full min-h-screen h-full flex flex-col bg-gray-200">
            <div className="mx-auto max-w-screen-lg flex flex-col w-full bg-gray-50 mb-10 ring-1 ring-gray-900 ring-opacity-5 shadow-md rounded-b-lg pb-4">
                <div className="h-full w-full relative overflow-hidden">
                    <img src="/images/auth_bg.jpg" alt="background" className="h-48 w-full object-cover" />
                    <div className="absolute top-0 left-0 flex flex-col items-center justify-center h-48 w-full bg-orange-700 bg-opacity-70">
                    </div>
                    <div className="flex px-8 relative flex-col">
                        <div className="h-0 mb-12">
                            <div className="flex flex-row transform -translate-y-2/3">
                                <div className="rounded-lg border-4 border-gray-50 bg-gray-50">
                                    <img src={`https://logo.clearbit.com/${ school.domain }`} className="w-auto h-28 rounded-md" />
                                </div>
                                <div className="flex flex-col ml-5 mt-7 mb-auto">
                                    <h1 className="text-4xl font-bold text-gray-50">{school.name}</h1>
                                    <div className="flex flex-row space-x-4 text-sm mt-5 text-gray-700">
                                        <p>{school.address}</p>
                                        <p className="text-xs my-auto text-gray-300">&#x2022;</p>
                                        <p>{studentRange(school.num_students)} students</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Container header="About">
                            {school.description ? <p className="text-gray-700">{school.description}</p> : <p className="text-gray-700 italic">No description available</p>}
                        </Container>
                        <Container header={`Upcoming ${user.school.id != school.id ? "Public " : ""}Events`}>
                            {events.length == 0 && <p className="text-gray-700 italic">No events scheduled</p>}
                            <div className="mt-2 grid grid-flow-row grid-cols-1 gap-x-4 gap-y-4">
                                {events.map(e => (
                                    <EventCard key={e.id}
                                        link={`event/${e.id}`}
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
                        </Container>

                        <Container header="Registered Student Organizations">
                            {orgs.length == 0 && <p className="text-gray-700 italic">No organizations registered</p>}
                            <div className="mt-2 grid grid-flow-row grid-cols-2 gap-x-4 gap-y-4 auto-rows">
                                {orgs.map(o => (
                                    <Link to={`org/${o.id}`} key={o.id} className="group flex flex-row border border-gray-300 rounded-md px-4 py-3 h-full w-full min-w-full">
                                        <div className="flex flex-col mr-4 w-full">
                                            <h3 className="text-gray-900">{o.name}</h3>
                                            <div className="text-gray-700 text-sm text-nowrap text-ellipsis overflow-hidden whitespace-nowrap w-full">
                                                {o.description || ""}
                                            </div>
                                            <div className="flex flex-row space-x-4 mt-2">
                                                {adminOrgs.find(ao => ao.organization == o.id) && <Pill>Admin</Pill>}
                                                {memberOrgs.find(mo => mo.organization == o.id) && <Pill>Member</Pill>}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Container>
                    </div>
                </div>
            </div>
        </div>
    )
}

