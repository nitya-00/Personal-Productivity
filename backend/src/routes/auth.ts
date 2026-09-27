import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
const router=Router();const secret=process.env.SESSION_SECRET;if(!secret)throw new Error('SESSION_SECRET is required.');const schema=z.object({email:z.string().email(),password:z.string().min(8).max(128)})
const issue=(res:any,id:string)=>res.cookie('timelens_session',jwt.sign({sub:id},secret,{expiresIn:'7d'}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}).json({status:'ok'})
router.post('/auth/register',async(req,res,next)=>{try{const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({message:'Use a valid email and an 8-character password.'});const user=await prisma.user.create({data:{email:p.data.email,passwordHash:await bcrypt.hash(p.data.password,12),displayName:p.data.email.split('@')[0]}});const legacy=await prisma.user.findUnique({where:{email:'local@timelens.local'}});if(legacy){await prisma.$transaction([prisma.dailyLog.updateMany({where:{userId:legacy.id},data:{userId:user.id}}),prisma.goal.updateMany({where:{userId:legacy.id},data:{userId:user.id}}),prisma.challenge.updateMany({where:{userId:legacy.id},data:{userId:user.id}}),prisma.reminder.updateMany({where:{userId:legacy.id},data:{userId:user.id}}),prisma.checkIn.updateMany({where:{userId:legacy.id},data:{userId:user.id}}),prisma.experiment.updateMany({where:{userId:legacy.id},data:{userId:user.id}}),prisma.user.delete({where:{id:legacy.id}})])};issue(res,user.id)}catch(e){next(e)}})
router.post('/auth/login',async(req,res,next)=>{try{const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid email or password.'});const user=await prisma.user.findUnique({where:{email:p.data.email}});if(!user?.passwordHash||!await bcrypt.compare(p.data.password,user.passwordHash))return res.status(401).json({message:'Invalid email or password.'});issue(res,user.id)}catch(e){next(e)}})
router.post('/auth/logout',(_q,res)=>res.clearCookie('timelens_session').json({status:'ok'}))
export default router
