export default function Button({ className, text, children, ...props }) {
    return <button className={`bg-orange-500 text-white py-2 px-6 rounded-md my-2 ml-auto font-bold text-sm ${className}`} {...props}>{text || children}</button>
}
