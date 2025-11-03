// src/app/simple-background/page.tsx
export default function SimpleBackgroundPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url('/29450ac0-1e56-47f8-b5e1-297b1229d702.png')", // Replace with your image path
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      {/* Centered text */}
      <div className="relative z-10 text-center text-white space-y-4 p-8">
        <h1 className="text-4xl md:text-6xl font-bold">T'as été ban</h1>
        <p className="text-xl md:text-2xl opacity-90">"Celui qui nous trompe n'est pas des notres."</p>
      </div>
    </div>
  )
}
