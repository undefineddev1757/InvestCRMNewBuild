import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export function Loader({ size = "md", className, text }: LoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  }

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className="relative">
        {/* Внешний круг */}
        <div className={cn(
          "rounded-full border-4 border-muted animate-spin",
          sizeClasses[size]
        )} style={{
          borderTopColor: "hsl(var(--primary))",
          borderRightColor: "hsl(var(--primary))",
          animationDuration: "1s"
        }} />
        
        {/* Внутренний круг */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted animate-spin",
          size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-8 w-8"
        )} style={{
          borderTopColor: "hsl(var(--primary))",
          borderRightColor: "hsl(var(--primary))",
          animationDuration: "0.8s",
          animationDirection: "reverse"
        }} />
      </div>
      
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

// Компонент для полноэкранного лоадера
export function FullScreenLoader({ text = "Загрузка..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader size="lg" text={text} />
    </div>
  )
}

// Компонент для лоадера в карточке
export function CardLoader({ text = "Загрузка..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader size="md" text={text} />
    </div>
  )
}
