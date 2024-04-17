import db from "~/utils/db.server.js"
import { json, redirect } from "@remix-run/cloudflare"
import { useLoaderData, Link } from "@remix-run/react"
import { getSession } from "../utils/sessions.js"
import AuthForm from "~/components/AuthForm.jsx"
import TextInput from "~/components/TextInput.jsx"
import { useEffect, useState } from "react"

export const meta = () => {
    return [
        { title: "UConnect" },
        {
            name: "description",
            content: "University event planner",
        },
    ]
}

export const loader = async ({request}) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))

    // If we are logged in, redirect to the user's school page
    if (session.has("id")) {
        const school = await (await db()).query(
            `select s2.domain from students s1, attends a, schools s2
                where s1.id = $1 and s1.id = a.student and a.school = s2.id`,
            [session.get("id")]
        )
        throw redirect(`/my/${school.rows[0].domain}`)
    }

    // Get all schools so users can find their school
    const res = await (await db()).query("SELECT * FROM Schools")
    return json({ schools: res.rows })
}

export default function Index() {
    // Use loader
    const { schools } = useLoaderData() || {}

    const [input, setInput] = useState("")
    const [suggestions, setSuggestions] = useState([])

    useEffect(() => {
        let inputStr = input.toLowerCase()
        if (inputStr.length == 0) {
            setSuggestions([])
            return
        }

        let ret = schools.filter(s =>
            s.name.toLowerCase().includes(inputStr)
            || s.domain.toLowerCase().includes(inputStr)
        ).sort((a, b) => a.name.localeCompare(b.name))

        setSuggestions(ret)
    }, [input])

    return (
        <AuthForm
            header="Find your school"
            linkHref="/new"
            linkText="Not listed? Add your university &#8594;"
        >
            <div className="relative inline-block w-full">
                <TextInput name="school" id="school" className="relative z-20" value={input} onChange={(e) => setInput(e.target.value)}/>
                {input.length > 0 && <div className="absolute -mt-2 pt-2 right-0 border border-gray-300 rounded-b-md w-96 bg-white z-10 shadow-lg ring-1 ring-black ring-opacity-5 flex flex-col">
                    {suggestions.slice(0, 5).map(s =>
                        <Link
                            key={s.name}
                            className="flex flex-row py-2 px-4 w-full"
                            to={`/my/${ s.domain }/login`}
                        >
                            <img src={`https://logo.clearbit.com/${s.domain}`} className="my-auto w-6 h-6 mr-2" />
                            {s.name}
                        </Link>
                    )}
                    {suggestions.length == 0 &&
                        <Link className="py-2 px-4 w-full" to={`/new`}>
                            Add <em>&quot;{input}&quot;</em> &#8594;
                        </Link>
                    }
                </div>}
            </div>
        </AuthForm>
    );
}
