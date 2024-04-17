
export default function SelectInput({ className, children, ...props }) {
    return <select
        className={`w-full py-2 px-4 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-offset-0 focus:ring-orange-500 focus:border-orange-500 ${ className }`}
        {...props}
    >
        {children}
    </select>
}
