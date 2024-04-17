import {
    Link,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "@remix-run/react"
import stylesheet from "./tailwind.css?url"
import { json } from "@remix-run/cloudflare"
import { commitSession, getSession } from "./utils/sessions.js"

export const links = () => [
    { rel: "stylesheet", href: stylesheet}
]

export const loader = async ({ request }) => {
    // Get session
    const session = await getSession(request.headers.get("Cookie"))
    const user = session.data

    return json({ error: null, user }, {
        headers: { "Set-Cookie": await commitSession(session) }
    })
}

export function Layout({ children }) {
    const { user } = useLoaderData()

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
            </head>
            <body className="w-screen min-h-screen overflow-x-clip">
                <nav className="flex flex-row py-5 px-6 bg-gray-50 ring-1 ring-gray-900 ring-opacity-5 shadow-lg absolute top-0 z-50 w-screen h-14">
                    <div className="flex flex-row w-full h-full mr-auto items-center justify-start space-x-8">
                        <Link to="/" className="h-full">
                            <img src="/images/uconnect_black.png" alt="logo" className="h-full w-auto" />
                        </Link>
                        {user?.id &&
                            <Link to={`/my/${ user.school.domain }`} className="flex flex-row h-full w-auto my-auto leading-none text-gray-900 hover:text-gray-700 hover:underline">
                                <img
                                    src={"https://logo.clearbit.com/" + user.school.domain}
                                    onError={({ currentTarget }) => {
                                        currentTarget.onerror = null
                                        currentTarget.src = '/images/default_school.png'
                                    }}
                                    alt={user.school.name + " Logo"}
                                    className="h-full w-auto mx-2"
                                />
                                {user.school.name}
                            </Link>
                        }
                    </div>
                    <div className="flex flex-row h-full w-full ml-auto items-center justify-end space-x-8">
                        {user?.id ?
                            <>
                                <Link to={`/my/${ user.school.domain }/event/new`} className="h-full w-auto my-auto leading-none text-gray-900 hover:text-gray-700 hover:underline">New Event</Link>
                                <Link to={`/my/${ user.school.domain }/org/new`} className="h-full w-auto my-auto leading-none text-gray-900 hover:text-gray-700 hover:underline">New Organization</Link>
                                <Link to={`/my/${ user.school.domain }/logout`} className="h-full w-auto my-auto leading-none text-gray-900 hover:text-gray-700 hover:underline">{user.first_name} {user.last_name} (Log out)</Link>
                            </>
                        :
                            <Link to="/" className="h-full w-auto my-auto leading-none text-gray-900 hover:text-gray-700 hover:underline">Find your school</Link>
                        }
                    </div>
                </nav>
                <main className="mt-14">
                    {children}
                </main>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
  return <Outlet />;
}
