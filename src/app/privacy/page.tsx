"use client"

import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"

export default function Privacy() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>}>
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/auth/signup">
            <Button variant="outline">← Back to Registration</Button>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Information We Collect</h2>
          <p className="text-gray-600 mb-4">
            We collect information you provide directly to us, such as when you create an account, 
            use our services, or contact us for support.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">
            We use the information we collect to provide, maintain, and improve our services, 
            process transactions, and communicate with you.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Information Sharing</h2>
          <p className="text-gray-600 mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except as described in this policy.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Data Security</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </p>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Privacy Policy, please contact us at 
            privacy@investcrm.com
          </p>
        </div>
      </div>
    </div>
    </Suspense>
  )
}
