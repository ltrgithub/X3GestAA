using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.EndpointHelper.Model
{
    public class EndpointsLookupModel
    {
        [JsonProperty("$resources")]
        public List<EndpointLookupModel> endpoints { get; set; }
    }
}
