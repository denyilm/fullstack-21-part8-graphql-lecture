const { ApolloServer, gql, UserInputError } = require('apollo-server')
const { ApolloServerPluginLandingPageGraphQLPlayground } = require("apollo-server-core")
const { v1: uuid } = require('uuid') 
const mongoose = require('mongoose')
const Person = require('./models/person')
const config = require('./utils/config')

// const MONGODB_URI = 'mongodb+srv://fullstack:halfstack@cluster0-ostce.mongodb.net/graphql?retryWrites=true'

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = gql`
  type User {
    username: String!
    friends: [Person!]!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Address {
    street: String!
    city: String!
  }

  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }

  enum YesNo {
    YES
    NO
  }

  type Query {
    personCount: Int!
    allPersons(phone: String): [Person!]!
    findPerson(name: String!): Person
    me: User
  }

  type Mutation {
      addPerson(
          name: String!
          phone: String
          street: String!
          city: String!
      ): Person
      editNumber(
        name: String!
        phone: String!
      ): Person
  }
`

const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: (root, args) => {
      // filters missing
      if(!args.phone){
        return Person.find({})
      }
      /**
       * Mongo DB
       * $exists
       * { field: { $exists: <boolean> } }
       * When <boolean> is true, $exists matches the documents that contain the field, including
       * documents where the field value is null. If <boolean> is false, the query returns only the
       * documents that do not contain the field.
       * MongoDB $exists does not correspond to SQL operator exists. For SQL exists, refer to the
       * $in operator.
      */
      return Person.find({ phone: { $exists: args.phone === 'YES' } })
    },
    findPerson: (root, args) => Person.findOne({ name: args.name })
  },
  Person: {
    address: root => {
      return {
        street: root.street,
        city: root.city
      }
    }
  },
  Mutation: {
    addPerson: async (root, args) => {
      const person = new Person({ ...args })
      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return person
    },
    editNumber: async (root, args) => {
      const person = await Person.findOne({ name: args.name })
      person.phone = args.phone

      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return person
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginLandingPageGraphQLPlayground({
      // options
    })
  ]
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
