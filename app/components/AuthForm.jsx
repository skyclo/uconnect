import { Link, Form } from "@remix-run/react"
import TextInput from "./TextInput"
import Button from "./Button"

export default function AuthForm({
    header, linkText, linkHref, schoolName, domain, showDomain=true, inputs, error, submitText, children
}) {
    return (
        <div className="w-screen overflow-hidden h-screen -mt-14">
            <img src="/images/auth_bg.jpg" alt="background" className="h-full w-full object-cover" />
            <div className="absolute top-0 left-0 flex flex-col items-center justify-center h-full w-full bg-orange-700 bg-opacity-50 overflow-hidden">

                <div className="flex flex-col items-center justify-center px-12 pt-12 pb-8 bg-gray-100 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mt-14">

                    {domain ?
                        <div className="flex flex-row">
                            <Link to="/" className="leading-none my-auto">
                                <img src="/images/uconnect_black.png" alt="logo" className="h-5 my-auto" />
                            </Link>
                            <div className="text-xl font-bold text-gray-900 mx-4 my-auto flex items-center leading-none">+</div>
                            <a href={`https://${ domain }`} target="_blank" rel="noreferrer">
                                <img
                                    src={"https://logo.clearbit.com/" + domain}
                                    onError={({ currentTarget }) => {
                                        currentTarget.onerror = null
                                        currentTarget.src = '/images/default_school.png'
                                    }}
                                    alt={domain + " Logo"}
                                    className="h-8 my-auto"
                                />
                            </a>
                        </div> :
                        <Link to="/">
                            <img src="/images/uconnect_black.png" alt="logo" className="h-5" />
                        </Link>
                    }

                    {header && <h1 className="text-2xl font-bold mt-6">{header}</h1>}
                    {linkHref ?
                        <Link to={linkHref} className="text-orange-500 mt-1 mb-5 text-sm">{linkText}</Link>
                        :
                        <p className="text-gray-500 mt-1 mb-5 text-sm">{linkText}</p>
                    }

                    {error && <p className="text-gray-100 bg-red-500 px-4 py-1 rounded-md mb-5">Error:{" "}{error}</p>}

                    <Form method="post" className="w-96 flex flex-col">
                        {domain && showDomain && <TextInput
                            type="text"
                            name="domain"
                            id="domain"
                            disabled
                            className="bg-gray-200 text-gray-500 mt-4"
                            value={`${ schoolName } (${ domain })`}
                        />}
                        {inputs?.map(({ label, type, name, required }) => (
                            <TextInput
                                key={name}
                                type={type}
                                name={name}
                                id={name}
                                placeholder={label}
                                required={required}
                                className="mt-4"
                            />
                        ))}
                        {children}
                        {submitText && <Button type="submit">{submitText}</Button>}
                    </Form>

                </div>

            </div>
        </div>
    )
}


