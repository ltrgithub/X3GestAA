using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper.Model.FieldValidation
{
    public class DiagnoseModel
    {
        [JsonProperty("$message")]
        public string message;

        [JsonProperty("$severity")]
        public string severity;

        [JsonProperty("code")]
        public string code;

        [JsonProperty("propname")]
        public string propname;
    }
}
