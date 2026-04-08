import { getClinicName } from '@/lib/clinic-config'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
	const clinicName = await getClinicName()
	return <LoginForm clinicName={clinicName} />
}
