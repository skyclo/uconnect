
export default function CheckboxInput({ className, ...props }) {
    return <input
        className={`rounded bg-gray-300 border-transparent focus:border-transparent focus:bg-gray-300 text-orange-500 focus:ring-1 focus:ring-offset-2 focus:ring-orange-500 h-4 w-4 ${ className }`}
        autoComplete="off"
        {...props}
    />
}
