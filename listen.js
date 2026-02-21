import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js'

const scannerSessionId = document.getElementById('scanner-session-id')
const scannerStatus = document.getElementById('scanner-status')
const dataInput = document.getElementById('data-input')

const sessionConfig = {
	session_id: null
}

scannerSessionId.addEventListener('input', () => {
	if (!scannerSessionId.value) {
		scannerStatus.style.display = 'none'
		sessionConfig.session_id = null
	} else {
		scannerStatus.style.display = 'block'
		scannerStatus.innerHTML = 'listening for scans from: ' + scannerSessionId.value
		sessionConfig.session_id = scannerSessionId.value
	}
})

const supabase = createClient(
	'https://mwsjvglbljyncdrivrtc.supabase.co',
	'sb_publishable_a_U12sK4KRvKiNFbscemOA_hK1_mRAn'
)

supabase
	.channel('scan-listener')
	.on(
		'postgres_changes',
		{
			event: 'INSERT',
			schema: 'public',
			table: 'scans'
		},
		payload => {
			if (sessionConfig.session_id && payload.new.session_id === sessionConfig.session_id) {
				console.log('Recieved data payload:', payload.new.data)
				dataInput.value = payload.new.data
			}
		}
	)
	.subscribe()
