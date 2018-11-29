"use strict"

const sortAlpha = (x, y) => { 
  if (x.name < y.name) {
    return -1;
  } else if (y.name < x.name) {
    return 1;
  } else {
    return 0;
  }
};

function app_or_error(appkit, name, cb) {
  appkit.api.get('/apps/' + name, (err, app) => {
    if (err) {
      appkit.terminal.error(err);
    }
    else {
      cb(app);
    }
  });
}

function list_clusters(appkit) {
  appkit.api.get('/clusters', (err, data) => {
    if (err) {
      return appkit.terminal.error(err);
    }
    else {
      data.forEach(cluster => {
        console.log(appkit.terminal.markdown(`  ***Name:*** ${cluster.name}
        ***Region:*** ${cluster.region_name}
        ***Tags:*** ${cluster.tags}
        `));
      });    }
    });
  }
  
  function list_topic_types(appkit, args) {
    let cluster_name = args.cluster.toLowerCase()
    appkit.api.get(`/clusters/${cluster_name}/configs`, (err, data) => {
      if (err) {
        return appkit.terminal.error(err);
      } 
      else {
        data.forEach(type => {
          let retention = type.retention_ms > 0 ? Math.round(type.retention_ms / 1000 / 60 / 60) + ' hours' : 'infinite';
          console.log(appkit.terminal.markdown(`  ***Name:*** ${type.name}
  ***Description:*** ${type.description || 'none'}
  ***Partitions:*** ${type.partitions}
  ***Replicas:*** ${type.replicas}
  ***Cleanup policy:*** ${type.cleanup_policy}
  ***Retention time:*** ${retention}
          `));
        });
      }
    })
  }
  
  function list_topics(appkit, args) {
    let cluster_name = args.cluster.toLowerCase()
    appkit.api.get(`/clusters/${cluster_name}/topics`, (err, data) => {
      if (err) {
        return appkit.terminal.error(err);
      } 
      else {
        data.sort(sortAlpha).forEach(topic => {
          console.log(appkit.terminal.markdown(`  ***Name: ${topic.name} ***
  ***Created:*** ${(new Date(topic.created)).toLocaleString()}
  ***Cluster:*** ${topic.cluster}
  ***Region:*** ${topic.region_name}
  ***Organization:*** ${topic.organization}
  ***Type:*** ${topic.config}
  ***Partitions:*** ${topic.partitions}
  ***Replicas:*** ${topic.replicas}
  ***Retention time:*** ${topic.retention_ms < 0 ? 'infinite' : Math.floor(topic.retention_ms / 1000 / 60 / 60 / 24) + ' days'}
  ***Cleanup policy:*** ${topic.cleanup_policy}
  ${topic.description ? "***Description:*** " + topic.description : ''}
          `));
        });
      }
    })
  }
  
  function get_topic(appkit, args) {
    let cluster_name = args.cluster.toLowerCase()
    appkit.api.get(`/clusters/${cluster_name}/topics/${args.topic}`, (err, topic) => {
      if (err) {
        return appkit.terminal.error(err);
      } 
      else {
        //TODO: add schema information
        console.log(appkit.terminal.markdown(`  ***Name: ${topic.name} ***
  ***Created:*** ${(new Date(topic.created)).toLocaleString()}
  ***Cluster:*** ${topic.cluster}
  ***Region:*** ${topic.region}
  ***Organization:*** ${topic.organization}
  ***Type:*** ${topic.config}
  ***Partitions:*** ${topic.partitions}
  ***Replicas:*** ${topic.replicas}
  ***Retention time:*** ${topic.retention_ms < 0 ? 'infinite' : Math.floor(topic.retention_ms / 1000 / 60 / 60 / 24) + ' days'}
  ***Cleanup policy:*** ${topic.cleanup_policy}
  ***Key type:*** ${topic.key_mapping}
  ***Allowed schemas:*** ${topic.schemas}
  ${topic.description ? "***Description:*** " + topic.description : ''}
        `));
      }
    })
  }
  
  function create_topic(appkit, args) {
    console.assert(args.NAME && /^[a-z0-9-]+$/i.test(args.NAME), 'A topic name must only contain lowercase alphanumerics and hyphens.');
    console.assert(args.cluster && /^[^-]+-[a-z0-9-]+$/i.test(args.cluster), 'A cluster name must only contain lowercase alphanumerics and hyphens.');
    
    let [_, cluster, region] = args.cluster.match(/([^-]+)-([a-z0-9-]+)/);
    let topic = {region: region.toLowerCase(), name:args.NAME.toLowerCase(), config:args.type, organization: args.organization};
    
    let task = appkit.terminal.task(`Creating **${args.type} topic ${args.NAME} in cluster ${args.cluster}**.`);
    task.start();
    
    appkit.api.post(JSON.stringify(topic), `/clusters/${args.cluster}/topics`, (err) => {
      if (err) {
        task.end('error');
        return appkit.terminal.error(err);
      } else {
        task.end('ok');
      }
    });
  }
  
  function delete_topic(appkit, args) {
    console.assert(args.NAME && /^[a-z0-9-]+$/i.test(args.NAME), 'A topic name must only contain lowercase alphanumerics and hyphens.');
    console.assert(args.cluster && /^[^-]+-[a-z0-9-]+$/i.test(args.cluster), 'A cluster name must only contain lowercase alphanumerics and hyphens.');
    
    let [_, cluster, region] = args.cluster.match(/([^-]+)-([a-z0-9-]+)/);
    
    let task = appkit.terminal.task(`Deleting ** topic **${args.NAME}** in cluster **${args.cluster}**.`);
    task.start();
    
    appkit.api.delete(`/clusters/${args.cluster}/topics/${args.NAME.toLowerCase()}`, (err) => {
      if (err) {
        task.end('error');
        return appkit.terminal.error(err);
      } else {
        task.end('ok');
      }
    });
  }
  

  function subscribe(appkit, args){
    let cluster = args.cluster.toLowerCase();
    let payload = {
      app: args.app,
      role: args.role,
      consumerGroupName: args.consumergroupname
    };
    let task = appkit.terminal.task(`Subscribing **${payload.app}** to topic **${args.topic}** as **${payload.role}**.`);
    task.start();
    console.log(payload)
    appkit.api.post(JSON.stringify(payload), `/clusters/${cluster}/topics/${args.topic}/acls`,  (err) => {
      if (err) {
        task.end('error');
        return appkit.terminal.error(err);
      } else {
        task.end('ok');
      }
    });
  }
  
  function unsubscribe(appkit, args){
    let cluster = args.cluster.toLowerCase();
    let topic = args.topic;
    let app = args.app;
    let role = args.role;
    let consumergroupname = args.consumergroupname
    let task = appkit.terminal.task(`Unsubscribing **${app}** from topic **${topic}**.`);
    task.start();
    if (consumergroupname) {
      console.log(`Delete URL : /clusters/${cluster}/topics/${topic}/acls/${app}/role/${role}/consumers/${consumergroupname}`)
      appkit.api.delete(`/clusters/${cluster}/topics/${topic}/acls/${app}/role/${role}/consumers/${consumergroupname}`,  (err) => {
        if (err) {
          task.end('error');
          return appkit.terminal.error(err);
        } else {
          task.end('ok');
        }
      });
    } else {
      appkit.api.delete(`/clusters/${cluster}/topics/${topic}/acls/${app}/role/${role}`,  (err) => {
        if (err) {
          task.end('error');
          return appkit.terminal.error(err);
        } else {
          task.end('ok');
        }
      });
    }
  }
  
  function list_subscriptions(appkit, args){
    let cluster = args.cluster.toLowerCase();
    let topic = args.topic;
    let app = args.app;

    console.assert((args.app || args.topic) && !(args.app && args.topic), 'Must specify only one of --topic or --app.');
    console.assert(!topic || cluster, 'Must provide cluster when searching by topic.');

    if (topic){
      appkit.api.get(`/clusters/${cluster}/topics/${topic}/acls`,  (err, data) => {
        if (err) {
          return appkit.terminal.error(err);
        } 
        else {
          data.sort(sortAlpha).forEach(sub => {
            console.log(appkit.terminal.markdown(`  ***ID:*** ${sub.id}
  ***App:*** ${sub.app_name}-${sub.space_name}
  ***Role:*** ${sub.role} `));
            if(sub.consumerGroupName) console.log(appkit.terminal.markdown(`  ***ConsumerGroupName:*** ${sub.consumerGroupName}`))
            console.log(appkit.terminal.markdown(`  ***Created:*** ${sub.created}
            `))
          });
        }     
      });
    }
    else {
      appkit.api.get(`/apps/${app}/topic-acls`,  (err) => {
        if (err) {
          return appkit.terminal.error(err);
        } 
        else {
          data.sort(sortAlpha).forEach(sub => {
            console.log(appkit.terminal.markdown(`  ***Topic: ${sub.topic_name} ***
  ***Role:*** ${sub.role}
            `));
          });
        }     
      });
    }

  }

  function list_schemas(appkit, args){
    let cluster = args.cluster.toLowerCase();

    appkit.api.get(`/clusters/${cluster}/schemas`,  (err, data) => {
      if (err) {
        return appkit.terminal.error(err);
      } 
      else {
        data.sort(sortAlpha).forEach((schema) => {
          console.log(appkit.terminal.markdown(`***${schema} ***`));
        });
      }     
    });
  }
  
  function add_key_schema_mapping(appkit, args){
    let valid_keytypes = ["none","string","avro"]
    let schema = args.schema

    if(!valid_keytypes.includes(args.keytype.toLowerCase())) {
      return appkit.terminal.error('keytype must have value "string", "none", or "avro"')
    }

    if (args.keytype.toLowerCase() == "avro" && (typeof(schema) === 'undefined' || schema == ''))
      return appkit.terminal.error('Must specify schema for keytype avro');
    
    let topic = args.topic;
    let cluster = args.cluster.toLowerCase();

    let payload = {
      topic: args.topic,
      schema: args.schema,
      keytype: args.keytype
    };
    
    let task = appkit.terminal.task(`Adding keytype ${payload.keytype}${payload.schema ? " with schema " + payload.schema : ""} to topic ${topic}.`);
    task.start();
    
    appkit.api.post(JSON.stringify(payload), `/clusters/${cluster}/topics/${topic}/key-schema-mapping`,  (err) => {
      if (err) {
        task.end('error');
        return appkit.terminal.error(err);
      } else {
        task.end('ok');
      }
    });    
  }

  function add_value_schema_mapping(appkit, args){
    console.assert((args.schema), 'Must specify schema');
    let topic = args.topic;
    let cluster = args.cluster.toLowerCase();

    let payload = {
      topic: args.topic,
      schema: args.schema
    };
    
    let task = appkit.terminal.task(`Adding schema ${payload.schema} to topic ${topic}.`);
    task.start();
    
    appkit.api.post(JSON.stringify(payload), `/clusters/${cluster}/topics/${topic}/value-schema-mapping`,  (err) => {
      if (err) {
        task.end('error');
        return appkit.terminal.error(err);
      } else {
        task.end('ok');
      }
    });    
  }
  

  function list_mappings(appkit, args){
    let cluster = args.cluster.toLowerCase();
    let topic = args.topic;

    appkit.api.get(`/clusters/${cluster}/topics/${topic}/schemas`,  (err, data) => {
      if (err) {
        return appkit.terminal.error(err);
      } 
      else {
        data.sort(sortAlpha).forEach((schema) => {
          console.log(appkit.terminal.markdown(`***${schema} ***`));
        });
      }     
    });
  }
  
  module.exports = {
    init(appkit) {
      const cluster = {
        alias: 'c',
        demand: true,
        string: true,
        description: 'The Kafka cluster and region, e.g. "nonprod-us-seattle".'
      }, type = {
        alias: 't',
        string: true,
        demand: true,
        description: 'The type of topic (state, ledger or event).'
      }, organization = {
        alias: 'o',
        string: true,
        demand: true,
        description: 'The organization the topic will belong to.'
      }, description = {
        alias: 'd',
        string: true,
        demand: false,
        description: 'A description of the topic.'
      }, role = {
        alias: 'r',
        string: true,
        demand: true,
        description: '"consumer" or "producer"'
      }, consumergroupname = {
        alias: 'g',
        string: true,
        description: 'Optional consumer group name for consumer role. When not specified random consumer group name will be assigned.'
      }, unsubscribeconsumergroupname = {
        alias: 'g',
        string: true,
        description: 'Optional consumer group name for consumer role. When not specified, and there are multiple consumer subscription for application and topic, randomly one consumer will be unsubscribed'
      }, app = {
        alias: 'a',
        string: true,
        demand: true,
        description: 'an existing app that already has a Kafka addon'
      }, topic = {
        alias: 't',
        string: true,
        demand: true,
        description: 'an existing topic'
      }, valueschema = {
        alias: 's',
        string: true,
        demand: true,
        description: 'an existing Avro schema name'
      }, keytype = {
        alias: 'k',
        demand: true,
        string: true,
        description: 'the key type ("string", "none", or "avro")'
      }, keyschema = {
        alias: 's',
        string: true,
        description: 'REQUIRED if the key type is "avro", an existing Avro schema name'
      }
      
      appkit.args.command('kafka:clusters', 'list available Kafka clusters', {}, list_clusters.bind(null, appkit));
      appkit.args.command('kafka:topics', 'list available Kafka topics', {cluster}, list_topics.bind(null, appkit));
      appkit.args.command('kafka:topics:info', 'show info for a Kafka topic', {cluster, topic}, get_topic.bind(null, appkit));
      appkit.args.command('kafka:topics:types', 'list available Kafka topic configuration types', {cluster}, list_topic_types.bind(null, appkit));
      appkit.args.command('kafka:topics:create NAME', 'create a Kafka topic', {cluster, type, organization, description}, create_topic.bind(null, appkit));
      // appkit.args.command('kafka:topics:delete NAME', 'delete a Kafka topic', {cluster}, delete_topic.bind(null, appkit));
      appkit.args.command('kafka:topics:assign-key', 'assign key type for a topic', {cluster, topic, keytype, schema: keyschema}, add_key_schema_mapping.bind(null, appkit));
      appkit.args.command('kafka:topics:assign-value', 'assign an Avro schema as a valid value type for a topic', {cluster, topic, schema: valueschema}, add_value_schema_mapping.bind(null, appkit));
      appkit.args.command('kafka:subscriptions', 'list app/topic subscriptions', {cluster, topic}, list_subscriptions.bind(null, appkit));
      appkit.args.command('kafka:subscribe', 'subscribe an app to a Kafka topic', {cluster, topic, app, role, consumergroupname}, subscribe.bind(null, appkit));
      appkit.args.command('kafka:unsubscribe', 'unsubscribe an app from a Kafka topic', {cluster, topic, app, role, consumergroupname: unsubscribeconsumergroupname}, unsubscribe.bind(null, appkit));
      appkit.args.command('kafka:schemas', 'list the Avro schemas available in a cluster', {cluster}, list_schemas.bind(null, appkit));
    },
    update() {
      // do nothing.
    },
    group:'topics',
    help:'view and create topics for routing to an app',
    primary:true
  }