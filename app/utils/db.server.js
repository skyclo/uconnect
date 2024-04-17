import pg from "pg"

const c = new pg.Pool({
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432,
    database: "postgres"
})

const client = async () => {
    return c
}

export default client

export const students = {
    find: {
        byEmail: async (email) => {
            const res = await (await client()).query(
                `select * from students
                    where email = $1`,
                [email]
            )

            return res?.rows?.[0] || null
        }
    },
    insert: async ({ email, password, firstName, lastName }) => {
        await (await client()).query(
            `insert into students (email, password, first_name, last_name)
                values ($1, $2, $3, $4)`,
            [email, password, firstName, lastName]
        )

        return await students.find.byEmail(email)
    }
}

export const schools = {
    find: {
        byDomain: async (domain) => {
            const res = await (await client()).query(
                `select * from schools
                    where domain = $1`,
                [domain]
            )

            return res?.rows?.[0] || null
        }
    },
    insert: async ({ name, domain, address }) => {
        await (await client()).query(
            `insert into schools (name, domain, address)
                values ($1, $2, $3)`,
            [name, domain, address]
        )

        return await schools.find.byDomain(domain)
    }
}
