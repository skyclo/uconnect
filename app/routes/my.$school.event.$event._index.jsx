import db, { schools } from "../utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Link, Form, useNavigation, useActionData } from "@remix-run/react"
import { commitSession, getSession } from "../utils/sessions.js"
import { useEffect, useRef, useState } from "react"
import Container from "../components/Container.jsx"
import Button from "../components/Button.jsx"
import TextAreaInput from "../components/TextAreaInput.jsx"

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
    ADD_COMMENT: 0,
    DELETE_COMMENT: 1,
    EDIT_COMMENT: 2,
    ADD_RATING: 3,
}

export const action = async ({ request }) => {
    const session = await getSession(request.headers.get("Cookie"))
    const user = session.data
    const body = new URLSearchParams(await request.text())
    const type = body.get("type")

    if (type == actions.ADD_COMMENT) {
        const message = body.get("message")
        const event = body.get("event")
        const school = user.school.id

        if (!message) {
            return json({ error: "You must provide a message" })
        }

        // Insert comment into the database
        const comment = await (await db()).query(
            `insert into "comments" ( string )
            values($1)
            returning id`,
            [message]
        )

        // Insert comment into commentedon table
        await (await db()).query(
            `insert into commentedon ( "event", "comment" )
            values($1, $2)`,
            [event, comment.rows[0].id]
        )

        // Insert comment into authoredby table
        await (await db()).query(
            `insert into authoredby ( "comment", student )
            values($1, $2)`,
            [comment.rows[0].id, user.id]
        )

        return json({ error: null }, {
            headers: { "Set-Cookie": await commitSession(session) }
        })
    } else if (type == actions.DELETE_COMMENT) {
        const comment = body.get("comment")

        // Delete comment from commentedon table
        await (await db()).query(
            `delete from commentedon where "comment" = $1`,
            [comment]
        )

        // Delete comment from authoredby table
        await (await db()).query(
            `delete from authoredby where "comment" = $1`,
            [comment]
        )

        // Delete comment from the database
        await (await db()).query(
            `delete from "comments" where id = $1`,
            [comment]
        )

        return json({ error: null }, {
            headers: { "Set-Cookie": await commitSession(session) }
        })
    } else if (type == actions.EDIT_COMMENT) {
        const comment = body.get("comment")
        const message = body.get("message")

        if (!message) {
            return json({ error: "You must provide a message" })
        }

        // Update comment in the database
        await (await db()).query(
            `update "comments" set string = $1 where id = $2`,
            [message, comment]
        )

        return json({ error: null }, {
            headers: { "Set-Cookie": await commitSession(session) }
        })
    } else if (type == actions.ADD_RATING) {
        const event = body.get("event")
        const rating = body.get("rating")

        // Check if the rating is valid
        if (rating < 1 || rating > 5) {
            return json({ error: "Invalid rating" })
        }

        // Check if the user has already rated the event
        const existingRating = await (await db()).query(
            `select * from ratings r, ratedon r2, ratedby r3
                where r.id = r2.rating and r.id = r3.rating and r2."event" = $1 and r3.student = $2`,
            [event, user.id]
        )

        if (existingRating.rows.length > 0) {
            // Update the rating
            await (await db()).query(
                `update ratings set rating = $1 where id = $2`,
                [rating, existingRating.rows[0].id]
            )
        } else {
            // Insert the rating
            const ratingId = await (await db()).query(
                `insert into ratings ( rating )
                values($1)
                returning id`,
                [rating]
            )

            // Insert the rating into the ratedon table
            await (await db()).query(
                `insert into ratedon ( "event", rating )
                values($1, $2)`,
                [event, ratingId.rows[0].id]
            )

            // Insert the rating into the ratedby table
            await (await db()).query(
                `insert into ratedby ( rating, student )
                values($1, $2)`,
                [ratingId.rows[0].id, user.id]
            )
        }

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

    // Get event
    const event = await (await db()).query(
        `select distinct e1.*, e2.public
            from events e1, schoolevents e2, heldat h, organizationevents e3, organizedby o1,
                organizations o2, registeredat r, schools s, attends a
            where ((e1.id = e2.id and e2.id = h."event" and h.school = s.id)
                    or (e1.id = e3.id and e3.id = o1."event" and o1.organization = o2.id
                        and o2.id = r.organization and r.school = s.id))
                and e1.id = $1 and s.id = $2`,
        [params.event, school.id]
    )

    if (event.rows.length == 0) {
        throw redirect(`/my/${ school.domain }`)
    }

    // Get event comments
    const comments = await (await db()).query(
        `select c.*, s.first_name, s.last_name, s.id as sid
            from "comments" c, commentedon c2, authoredby a, students s
            where c.id = c2."comment" and c.id = a."comment" and s.id = a.student
                and c2."event" = $1`,
        [params.event]
    )

    // Get organization
    const org = await (await db()).query(
        `select o.* from organizations o, organizedby o2
            where o.id = o2.organization and o2."event" = $1`,
        [params.event]
    )

    // Get all ratings for the event
    const ratings = await (await db()).query(
        `select r.*, r2.event, r3.student from ratings r, ratedon r2, ratedby r3
            where r.id = r2.rating and r.id = r3.rating and r2.event = $1`,
        [params.event]
    )

    // Get the user's rating for the event
    const rating = ratings.rows.find(({ student }) => student == user.id) || null

    // Calculate the average rating
    const averageRating = ratings.rows.length == 0 ? 0 : ratings.rows.reduce((a, { rating }) => a + rating, 0) / ratings.rows.length
    const ratingCount = ratings.rows.length

    if (event.rows.length == 0) {
        throw redirect(`/my/${school.domain}`)
    }

    return json({ error: null, user, school, eventTypes: eventTypes.rows, event: event.rows[0], comments: comments.rows, rating, averageRating, ratingCount, org: org.rows[0] }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}


export default function School() {
    // Use loader
    const { error, user, school, eventTypes, event, comments, rating, averageRating, ratingCount, org } = useLoaderData() || {}
    console.log(rating)
    let [editMode, setEditMode] = useState(-1)
    let [userRating, setUserRating] = useState(rating ? rating.rating : 0)
    let [hoverRating, setHoverRating] = useState(0)

    let $commentForm = useRef(null)
    let navigation = useNavigation()
    let { error: actionError } = useActionData() || {}

    useEffect(() => { // Reset form after navigation
        if (navigation.state == "idle") {
            $commentForm?.current?.reset()
        }
    }, [navigation.state])

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
                                <h1 className="font-bold text-gray-900 text-4xl">{event.name}</h1>
                                <Form method="post" className="flex flex-row">
                                    <input type="hidden" name="event" value={event.id} />
                                    <input type="hidden" name="rating" value={userRating} />
                                    <input type="hidden" name="type" value={actions.ADD_RATING} />

                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <button key={i} className="pr-1 my-auto" onClick={() => school.id == user.school.id ? setUserRating(i) : null} onMouseEnter={() => setHoverRating(i)} onMouseLeave={() => setHoverRating(0)} type="submit" disabled={school.id != user.school.id}>
                                            <svg className={`w-4 h-4 ${ hoverRating >= i ? "text-orange-300" : hoverRating > 0 ? "text-gray-300" : userRating >= i ? "text-orange-500" : userRating > 0 ? "text-gray-300" : averageRating >= i ? "text-orange-500" : "text-gray-300" }`} clipRule="evenodd" fill="currentColor" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m11.322 2.923c.126-.259.39-.423.678-.423.289 0 .552.164.678.423.974 1.998 2.65 5.44 2.65 5.44s3.811.524 6.022.829c.403.055.65.396.65.747 0 .19-.072.383-.231.536-1.61 1.538-4.382 4.191-4.382 4.191s.677 3.767 1.069 5.952c.083.462-.275.882-.742.882-.122 0-.244-.029-.355-.089-1.968-1.048-5.359-2.851-5.359-2.851s-3.391 1.803-5.359 2.851c-.111.06-.234.089-.356.089-.465 0-.825-.421-.741-.882.393-2.185 1.07-5.952 1.07-5.952s-2.773-2.653-4.382-4.191c-.16-.153-.232-.346-.232-.535 0-.352.249-.694.651-.748 2.211-.305 6.021-.829 6.021-.829s1.677-3.442 2.65-5.44z" fillRule="nonzero"/></svg>
                                        </button>
                                    ))}

                                    <p className="my-auto leading-none ml-4 text-sm"><b>{averageRating.toFixed(1)}</b> ({ratingCount})</p>
                                </Form>
                            </div>
                            <div className="flex flex-row space-x-4 text-sm mt-3 text-gray-700">
                                <p>{event.public ? "Public" : event.public == false ? "Private" : "Organization"} Event</p>
                                <p className="text-xs my-auto text-gray-300">&#x2022;</p>
                                <p>{eventTypes.find(({ id }) => id == event.type).name}</p>
                            </div>
                        </Container>
                        <Container header="Date">
                            <p>
                                {new Date(event.date_from).toLocaleDateString("en-us", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                })}
                            </p>
                        </Container>
                        <Container header="Time">
                            <p>
                                {new Date(event.date_from).toLocaleTimeString("en-us", {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true
                                })}
                                {" "}&#8594;{" "}
                                {new Date(event.date_to).toLocaleTimeString("en-us", {
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true
                                })}
                            </p>
                        </Container>
                        <Container header="About">
                            {event.description ? <p>{event.description}</p> : <p className="text-gray-700 italic">No description available</p>}
                        </Container>
                        {org && <Container header="Organization">
                            <Link to={`../org/${org.id}`} className="text-orange-500 hover:underline">{org.name}</Link>
                        </Container>}
                        <Container header="Location">
                            <p>{event.address}</p>
                        </Container>
                        <div className="h-px my-4 bg-gray-900 bg-opacity-5"></div>
                        <Container header="Comments">
                            {school.id == user.school.id ? <Form method="post" ref={$commentForm} className="flex flex-col">
                                <div className="flex flex-row mt-4">
                                    <img src="/images/default_user.png" className="w-8 h-8 rounded-full" />
                                    <TextAreaInput className="ml-4 w-full py-2 px-4 border border-gray-300 rounded-md rounded-tl-none" name="message" placeholder="Comment"></TextAreaInput>
                                </div>
                                <input type="hidden" name="event" value={event.id} />
                                <input type="hidden" name="school" value={school.id} />
                                <input type="hidden" name="author" value={user.id} />
                                <input type="hidden" name="type" value={actions.ADD_COMMENT} />
                                <Button type="submit">Send</Button>
                            </Form>
                                :
                                <p className="text-gray-700 italic mb-4">You must be a student at this school to comment</p>
                            }
                            {comments.map(({ id, string, first_name, last_name, sid, datetime }) => (
                                <div key={id} className="flex flex-row mt-4">
                                    <img src="/images/default_user.png" className="w-8 h-8 rounded-full" />
                                    <div className="flex flex-col ml-4 w-full">
                                        <div className="text-sm font-bold text-gray-900 flex flex-row space-x-4 justify-between">
                                            <p>{first_name} {last_name}</p>
                                            <p className="text-gray-700 font-normal text-xs my-auto">
                                                {new Date(datetime).toLocaleDateString("en-us", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric"
                                                })}{" "}
                                                {new Date(datetime).toLocaleTimeString("en-us", {
                                                    hour: "numeric",
                                                    minute: "numeric",
                                                    hour12: true
                                                })}
                                            </p>
                                        </div>
                                        {editMode == id ?
                                            <Form method="post" ref={$commentForm} className="flex flex-col">
                                                <TextAreaInput name="message" placeholder="Comment" defaultValue={string} className="mt-2 w-full py-2 px-4 border border-gray-300 rounded-md rounded-tl-none"></TextAreaInput>
                                                <input type="hidden" name="comment" value={id} />
                                                <input type="hidden" name="type" value={actions.EDIT_COMMENT} />
                                                <div className="ml-auto flex flex-row space-x-4 mt-2">
                                                    <button type="submit" className="text-xs text-gray-700 hover:text-orange-500">Save</button>
                                                    <button type="button" onClick={() => setEditMode(-1)} className="text-xs text-gray-700 hover:text-red-500">Cancel</button>
                                                </div>
                                            </Form>
                                            :
                                            <div className=" mt-2 flex flex-col w-full py-3 px-4 border border-gray-300 rounded-md rounded-tl-none">
                                                <div className="flex flex-row space-x-4">
                                                    <p>{string}</p>
                                            </div>
                                        </div>
                                        }
                                        {sid == user.id && editMode < 0 && <Form method="post" className="flex flex-row space-x-4 mt-2">
                                            <input type="hidden" name="comment" value={id} />
                                            <input type="hidden" name="type" value={actions.DELETE_COMMENT} />
                                            <button type="button" onClick={() => setEditMode(id)} className="text-xs text-gray-700 hover:text-orange-500">Edit</button>
                                            <button type="submit" className="text-xs text-gray-700 hover:text-red-500">Delete</button>
                                        </Form>}
                                    </div>
                                </div>
                            ))}
                        </Container>
                    </div>
                </div>
            </div>
        </div>
    )
}

