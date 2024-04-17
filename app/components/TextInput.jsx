
export default function TextInput({ className, ...props }) {
    return <input
        className={`w-full py-2 px-4 border border-gray-300 rounded-md focus:ring-1 focus:ring-offset-0 focus:ring-orange-500 focus:border-orange-500 ${ className }`}
        {...props}
    />
}
