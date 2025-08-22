import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'

export default function Navbar() {
    const navigate = useNavigate()
    const {user} = useUser()
    const { openSignIn } = useClerk()

  return (
    <div className='fixed z-5 w-full backdrop-blur-2xl flex justify-between items-center py-3 px-4 sm:px-20 xl:px-32 cursor-pointer' >
        <img src={assets.logo} alt="logo" className='w-32 sm:w-44 cursor-pointer' onClick={()=> navigate('/') } />

        {
            user ? <UserButton />
            :
            (
                <button onClick={openSignIn}  className='flex items-center gap-2 squared-full text-sm cursor-pointer bg-primary text-white px-4 py-3'> Get Started <ArrowRight className='w-4 h-4'/> </button> 

            )
        }
 
    </div>
  )
}
