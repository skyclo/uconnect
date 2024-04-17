
export default function Container({ className, header, children, ...props }) {
    return <div
        className={`flex flex-col py-4 ${ className }`}
        {...props}
    >
        {header && <h2 className="uppercase text-sm font-bold text-gray-700 mb-1">{header}</h2>}
        {children}
    </div>
}
