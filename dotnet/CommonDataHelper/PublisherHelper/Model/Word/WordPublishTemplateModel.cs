using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.PublisherHelper.Model.Word
{
    public class WordPublishTemplateModel
    {
        [JsonProperty("$etag")]
        public int etag;

        [JsonProperty("$uuid")]
        public string uuid;

        [JsonProperty("code")]
        public string code;

        [JsonProperty("description")]
        public string description;

        [JsonProperty("owner")]
        public SyracuseUuidModel owner;

        [JsonProperty("endpoint")]
        public SyracuseUuidModel endpoint;

        [JsonProperty("teams")]
        public List<SyracuseUuidModel> teams;

        [JsonProperty("tags")]
        public List<SyracuseUuidModel> tags;

        [JsonProperty("activ")]
        public string activ;

        [JsonProperty("leg")]
        public string leg;

        [JsonProperty("cpy")]
        public string cpy;

        [JsonProperty("$url")]
        public string url;
    }
}
