using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.EndpointHelper.Model
{
    public class EndpointModel
    {
        [JsonProperty("description")]
        public String description;

        [JsonProperty("$uuid")]
        public String uuid;
    }
}
