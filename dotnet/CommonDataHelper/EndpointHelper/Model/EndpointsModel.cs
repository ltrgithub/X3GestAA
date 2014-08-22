using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.EndpointHelper.Model
{
    public class EndpointsModel
    {
        [JsonProperty("$resources")]
        public List<EndpointModel> endpoints { get; set; }
    }
}
