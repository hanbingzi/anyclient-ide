
POST /index-test1/_search
{
  "query":{"match_all":[]}
}


POST /DOC
{
 ""query""
}

POST /_aliases
{
  "query": {
    "match_all": [] //这是一个测试
  }
}