'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stethoscope } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ clinicName }: { clinicName: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const supabase = createClient()

    if (useMagicLink) {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (err) {
        setError(err.message)
        setLoading(false)
      } else {
        setSent(true)
        setLoading(false)
      }
    } else {
      const password = (form.elements.namedItem('password') as HTMLInputElement).value
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message)
        setLoading(false)
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-[#f5f7fa] relative overflow-hidden p-4'>
      {/* Diamond pattern background */}
      <div
        className='absolute inset-0 opacity-40'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232e37a4' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Logo above card */}
      <div className='flex items-center gap-2.5 mb-8 relative z-10'>
        <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-[#2e37a4]'>
          <Stethoscope className='w-4 h-4 text-white' />
        </div>
        <span className='text-[15px] font-semibold text-[#0a1b39]'>{clinicName}</span>
      </div>

      {/* Card */}
      <div className='relative z-10 w-full max-w-[420px] mx-4 bg-white border border-[#e7e8eb] rounded-[20px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] p-6 sm:p-10'>
        {sent ? (
          <div className='text-center space-y-2'>
            <h1 className='text-[20px] font-bold text-[#0a1b39]'>Check your email</h1>
            <p className='text-[14px] text-[#6c7688]'>We sent a login link to your email. Click it to sign in.</p>
          </div>
        ) : (
          <>
            <div className='mb-5'>
              <h1 className='text-[20px] font-bold text-[#0a1b39] leading-[24px]'>Sign In</h1>
              <p className='text-[14px] text-[#6c7688] mt-1 leading-[21px]'>
                {useMagicLink ? 'Enter your email to receive a magic link' : 'Enter your credentials to access the dashboard'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-1'>
                <Label htmlFor='email' className='text-[13px] font-medium text-[#0a1b39]'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  required
                  className='h-9 text-[14px] border-[#e7e8eb] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] focus-visible:ring-[#2e37a4] placeholder:text-[#9da4b0]'
                />
              </div>
              {!useMagicLink && (
                <div className='space-y-1'>
                  <Label htmlFor='password' className='text-[13px] font-medium text-[#0a1b39]'>Password</Label>
                  <Input
                    id='password'
                    name='password'
                    type='password'
                    required
                    className='h-9 text-[14px] border-[#e7e8eb] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] focus-visible:ring-[#2e37a4] placeholder:text-[#9da4b0]'
                  />
                </div>
              )}
              {error && <p className='text-[13px] text-[#ef1e1e] bg-red-50 px-3 py-2 rounded-md'>{error}</p>}
              <button
                type='submit'
                disabled={loading}
                className='w-full h-[38px] bg-[#2e37a4] hover:bg-[#252d8a] text-white text-[14px] font-medium rounded-md transition-colors disabled:opacity-60 mt-1'
              >
                {loading ? (useMagicLink ? 'Sending…' : 'Signing in…') : (useMagicLink ? 'Send Magic Link' : 'Sign In')}
              </button>
            </form>
            <button
              type='button'
              onClick={() => { setError(''); setUseMagicLink(v => !v) }}
              className='mt-4 w-full text-[13px] text-[#2e37a4] hover:underline text-center'
            >
              {useMagicLink ? 'Sign in with password instead' : 'Send magic link instead'}
            </button>
          </>
        )}
      </div>

      <p className='relative z-10 mt-8 text-[13px] text-[#6c7688]'>Copyright @2025 - {clinicName}</p>
    </div>
  )
}
