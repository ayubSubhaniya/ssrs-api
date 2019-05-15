#!/bin/bash

host="localhost"
port="3001"

db_uri="mongodb://ssrsDaiict:ssrsDaiict123@ds119802.mlab.com:19802/ssrs-daiict"

mail_user="201501405@daiict.ac.in"
mail_pass="********"
node_env="development"

export HOST=${host}
export PORT=${port}
export DB_URI=${db_uri}
export MAIL_USER=${mail_user}
export MAIL_PASS=${mail_pass}
export NODE_ENV=${node_env}


