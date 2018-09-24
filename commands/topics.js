"use strict"

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

function list_topic_types(appkit) {
  appkit.api.get('/topic_configs', (err, data) => {
    if (err) {
      return appkit.terminal.error(err);
    } 
    else {
      data.forEach((type) => {
        console.log(appkit.terminal.markdown(`  ***Name:*** ${type.name}
  ***Description:*** ${type.description}
  ***Cleanup policy:*** ${type.cleanup_policy}
  ***Retention time:*** ${type.compliance.join(', ')}
        `));
      });
    }
  })
}

function list_topics(appkit) {
  appkit.api.get('/topics', (err, data) => {
    if (err) {
      return appkit.terminal.error(err);
    } 
    else {
      data.sort((x, y) => { 
        if(x.name < y.name) {
          return -1;
        } else if (y.name < x.name) {
          return 1;
        } else {
          return 0;
        }
      }).forEach((topic) => {
          topic.id,
          topic.name, 
          topic.config_name,
          topic.topic
          topic.partitions, 
          topic.replicas, 
          topic.retention_ms, 
          topic.cleanup_policy, 
          topic.cluster, 
          topic.region,
          topic.organization, 
          topic.description
        console.log(appkit.terminal.markdown(`  ***Name: ${topic.name} ***
  ***Created:*** ${(new Date(topic.created_at)).toLocaleString()}
  ***Cluster:*** ${topic.cluster}
  ***Region:*** ${topic.region}
  ***Org:*** ${topic.organization}
  ***Type:*** ${topic.config_name}
  ***Partitions:*** ${topic.partitions}
  ***Replicas:*** ${topic.replicas}
  ***Retention time:*** ${topic.retention_ms < 0 ? 'infinite' : (topic.retention_ms * 1000 * 60 * 60 * 24) + ' days'}
  ***Cleanup policy:*** ${topic.cleanup_policy}
  ${topic.description ? "***Description:*** " + topic.description : ''}
        `));
      });
    }
  })
}

function create_topic(appkit, args) {
  console.assert(args.NAME && /^[a-z0-9-]+$/i.test(args.NAME), 'A topic name must only contain alphanumerics and hyphens and must start.');

  if (!args.region) {
    args.region = 'us-seattle';
  }

  if (!args.cluster == 'nonprod') {
    args.cluster = 'non-prod';
  }

  if (args.cluster == 'prod'){
    console.assert(/^(?!(qa|dev|stg|test)-)[a-z0-9-]+$/i.test(args.NAME), 'A prod topic must not start with "qa-", "test-", "stg-" or "dev-".');
  }
  else if (args.cluster == 'non-prod'){
    console.assert(/^(qa|dev|stg|test)-[a-z0-9-]+$/i.test(args.NAME), 'A non-prod topic must start with "qa-", "test-", "stg-" or "dev-".');
  }
  else {
    console.error('The only valid clusters are prod and non-prod.');
    process.exit(1);
  }

  let topic = {region: args.region.toLowerCase(), name:args.NAME.toLowerCase(), topic_config:args.type, org: args.organization};

  let task = appkit.terminal.task(`Creating ${args.type} topic ${args.NAME}.`);
  task.start();

  appkit.api.post(JSON.stringify(topic), '/topics',  (err) => {
    if(err) {
      task.end('error');
      return appkit.terminal.error(err);
    } else {
      task.end('ok');
    }
  });
}

module.exports = {
  init(appkit) {
    const region = {
      'alias':'r',
      'demand':false,
      'string':true,
      'default':'us-seattle',
      'description':'The region (defaults to "us").'
    }, cluster = {
      'alias':'c',
      'demand':true,
      'string':true,
      'default':'non-prod',
      'description':'The cluster (prod or non-prod).'
    }, type = {
      'alias':'t',
      'string':true,
      'demand':true,
      'description':'The type of topic (state, ledger or event)'
    }, organization = {
      alias:'o',
      string:true,
      demand:true,
      description:'The organization the topic will belong to.'
    }, description = {
      'alias':'d',
      'string':true,
      'demand':false,
      'description':'A description of the topic.'
    }

    appkit.args.command('topics', 'list available Kafka topics.', {region}, list_topics.bind(null, appkit));
    appkit.args.command('topics:types', 'list available Kafka topic configuration types.', {}, list_topic_types.bind(null, appkit));
    appkit.args.command('topics:create NAME', 'create a Kafka topic.', {region, cluster, type, organization}, create_topic.bind(null, appkit));
  },
  update() {
    // do nothing.
  },
  group:'topics',
  help:'view and create topics for routing to an app',
  primary:true
}