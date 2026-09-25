import { Router } from 'express'
import { z } from 'zod'
import { ReminderType } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
const router=Router();const types=Object.values(ReminderType) as [ReminderType,...ReminderType[]]
router.get('/reminders',async(_q,res,next)=>{try{const u=await getLocalProfile();const items=await prisma.reminder.findMany({where:{userId:u.id}});res.json({items})}catch(e){next(e)}})
router.put('/reminders/:type',async(req,res,next)=>{try{const type=req.params.type as ReminderType;if(!types.includes(type))return res.status(400).json({message:'Unknown reminder.'});const p=z.object({isEnabled:z.boolean(),timeOfDay:z.string().regex(/^\d{2}:\d{2}$/).nullable()}).safeParse(req.body);if(!p.success)return res.status(400).json({message:'Choose a valid reminder time.'});const u=await getLocalProfile();res.json(await prisma.reminder.upsert({where:{userId_type:{userId:u.id,type}},update:p.data,create:{userId:u.id,type,...p.data}}))}catch(e){next(e)}})
export default router
