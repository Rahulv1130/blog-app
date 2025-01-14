import { PrismaClient } from "@prisma/client/edge"
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt"
import { Hono } from "hono";
import { createBlogInput , updateBlogInput } from "@rahulv1130/medium-common"


export const blogRouter = new Hono<{
    Bindings: {
      DATABASE_URL: string;
      JWT_SECRET: string;
    },
    Variables: {
        userId: any;
    }
}>();


blogRouter.use("/*" , async (c,next) => {                 // Middleware
    const authHeader = c.req.header("authorization") || "";
    try{
        const user = await verify(authHeader , c.env.JWT_SECRET);
        if(user) {
            c.set("userId", user.id ); 
            await next(); 
        }
        else {
            c.status(403)
            return c.json({ message: "You are not logged in" }) 
        }
    } catch(e){
        c.status(403)
         return c.json({ message: "You are not logged in" })
    }
  })


blogRouter.post("/" , async (c)=> {                       // Route for adding blog
    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);
    if(!success){
        c.status(411)
        return c.json({ message: "Inputs are incorrect" })
    }
    const auhtorId = c.get("userId");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());


    const blog = await prisma.blog.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: Number(auhtorId)
        }
    })

    return c.json({ id: blog.id })
})
  
  
blogRouter.put("/" , async (c)=> {                        // Route for updating blog
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if(!success){
        c.status(411)
        return c.json({ message: "Inputs are incorrect" })
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());


    try{
        const blog = await prisma.blog.update({
            where:{
                id: body.id
            },
            data: {
                title: body.title,
                content: body.content,
            }
        })
    
        return c.json({ id: blog.id })
    } catch(e){
        c.status(400)
        return c.json({ error: "Something went wrong" })
    }
})


blogRouter.get("/bulk" , async (c)=> {  
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());


    const blogs = await prisma.blog.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    })

    return c.json({ blogs })
})
  
  
blogRouter.get("/:id" , async (c)=> {                        // Route for getting a particular blog
    const id = c.req.param("id");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());


    try{
        const blog = await prisma.blog.findFirst({
            where: {
                id: Number(id)
            },
            select: {
                id: true,
                content: true,
                title: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        })
    
        return c.json({ blog })
    
    } catch(e){
        c.status(400);
        return c.json({error: "Something went wrong"})
    }
})