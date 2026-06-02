export default function Spinner({ size = 5 }) {
  return (
    <div className="flex items-center justify-center py-20">
      <span
        className="border-2 border-hairline border-t-primary rounded-full animate-spin"
        style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      />
    </div>
  )
}
