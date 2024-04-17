import db, {schools} from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Link, Form, useActionData } from "@remix-run/react"
import { commitSession, getSession } from "../utils/sessions.js"
import { useState } from "react"
import Container from "../components/Container.jsx"
import TextInput from "../components/TextInput.jsx"
import SelectInput from "../components/SelectInput.jsx"
import TextAreaInput from "../components/TextAreaInput.jsx"
import Button from "../components/Button.jsx"
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
    const publicEvent = data.get("public") === "on"
    const organization = data.get("organization")
    const type = data.get("type") // aka. category
    const date = data.get("date")
    const timeFrom = data.get("timeFrom")
    const timeTo = data.get("timeTo")
    const address = data.get("address")
    const description = data.get("description")

    let dtFrom = new Date(`${ date }T${ timeFrom }:00${ new Date().getTimezoneOffset() > 0 ? "-" : "+" }${ Math.abs(new Date().getTimezoneOffset() / 60).toString().padStart(2, "0") }00`)
    let dtTo = new Date(`${ date }T${ timeTo }:00${ new Date().getTimezoneOffset() > 0 ? "-" : "+" }${ Math.abs(new Date().getTimezoneOffset() / 60).toString().padStart(2, "0") }00`)

    // Check if the event is in the past
    if (dtFrom < Date.now()) {
        return json({ error: "Event date is in the past" })
    }

    // Check if the event ends before it starts
    if (dtTo < dtFrom) {
        return json({ error: "Event ends before it starts" })
    }

    // Check if the event is longer than 24 hours
    if (dtTo - dtFrom > 86400000) {
        return json({ error: "Event is longer than 24 hours" })
    }

    // Check if the event overlaps with another event
    const events = await (await db()).query(
        `select distinct e1.*, e2.public from events e1, schoolevents e2, heldat h, organizationevents e3, organizedby o1, organizations o2, registeredat r, schools s, attends a
        where ((e1.id = e2.id and e2.id = h."event" and h.school = s.id) or (e1.id = e3.id and e3.id = o1."event" and o1.organization = o2.id and o2.id = r.organization and r.school = s.id))
            and date_from < $1 and date_to > $2
            and s.id = $3`,
        [dtTo, dtFrom, school.id]
    )

    if (events.rows.length > 0) {
        return json({ error: "Event overlaps with another event" })
    }

    // Insert the event into the database
    const event = await (await db()).query(
        `insert into events ( name, type, date_from, date_to, description, address )
            values($1, $2, $3, $4, $5, $6)
            returning id`,
        [name, type, dtFrom, dtTo, description, address]
    )

    if (organization != 0) {
        // Add the event to the organization's event list
        await (await db()).query(
            `insert into organizationevents (id)
                values($1)`,
            [event.rows[0].id]
        )

        // Add the event to the organization's event list
        await (await db()).query(
            `insert into organizedby (organization, event)
                values($1, $2)`,
            [organization, event.rows[0].id]
        )
    } else {
        // Add a SchoolEvent
        await (await db()).query(
            `insert into schoolevents (id, public)
            values($1, $2)`,
            [event.rows[0].id, publicEvent]
        )

        // Add SchoolEvent to the school event list
        await (await db()).query(
            `insert into heldat (school, event)
            values($1, $2)`,
            [school.id, event.rows[0].id]
        )
    }

    return redirect(`/my/${school.domain}/event/${event.rows[0].id}`)
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

    // Get list of event types
    const eventTypes = await (await db()).query("SELECT * FROM EventTypes")

    // Get user's organizations where they are an admin
    const orgs = await (await db()).query(
        `select o.* from organizations o, administrates a
            where o.id = a.organization and a.student = $1`,
        [session.data.id]
    )

    return json({ error: null, school, eventTypes: eventTypes.rows, orgs: orgs.rows }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}

export default function School() {
    // Use loader
    const { eventTypes, orgs } = useLoaderData() || {}
    const { error: actionError } = useActionData() || {}

    const [org, setOrg] = useState(0)
    const [category, setCategory] = useState(0)

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
                                <TextInput type="text" name="name" className="text-2xl mt-0" required placeholder="New Event..." />
                            </div>
                            <div className="flex flex-row mt-4">
                                <TextInput type="date" name="date" className="mr-6 w-max" defaultValue={
                                    Date.now().toLocaleString("en-us", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric"
                                    })
                                } required />
                                <TextInput type="time" className="mt-0 w-max" name="timeFrom" required/>
                                <span className="mx-4 my-auto">to</span>
                                <TextInput type="time" className="mt-0 w-max" name="timeTo" required/>
                            </div>
                        </Container>
                        <Container header="Event Details">
                            <SelectInput
                                name="organization"
                                required
                                value={org}
                                onChange={(e) => setOrg(e.target.value)}
                                className={`mt-4 ${ org == 0 ? "text-gray-500" : "" }`}
                            >
                                <option value="0" className="text-gray-500">Add organization</option>
                                {orgs.map(org => (
                                    <option key={org.id} value={org.id} className="text-gray-900">{org.name}</option>
                                ))}
                            </SelectInput>
                            {org == 0 &&
                                <label className="mt-4 flex flex-row space-x-2">
                                    <CheckboxInput type="checkbox" name="public" className="my-auto" />
                                    <span className="mb-px leading-none">Public</span>
                                </label>
                            }
                            <SelectInput
                                name="type"
                                required
                                defaultValue="0"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className={`mt-4 ${ category == 0 ? "text-gray-500" : "" }`}
                            >
                                <option disabled selected value="0"  className="text-gray-500">Add category</option>
                                {eventTypes.map(et => (
                                    <option key={et.id} value={et.id} className="text-gray-900">{et.name}</option>
                                ))}
                            </SelectInput>
                            <TextAreaInput name="description" placeholder="Add description..." className="mt-4"/>
                            <TextInput type="text" name="address" className="mt-4" placeholder="Add location..." />
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

